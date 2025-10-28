const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { auth } = require('../middleware/auth');
const aiService = require('../utils/aiService');
const Course = require('../models/Course');
const Document = require('../models/Document');
const { Quiz } = require('../models/Quiz');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
});

// Middleware to check if user is a teacher
const requireTeacher = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teacher role required.' });
  }
  next();
};

// Text processing utilities
const extractTextFromFile = async (file) => {
  try {
    switch (file.mimetype) {
      case 'text/plain':
        return file.buffer.toString('utf-8');
      
      case 'application/pdf':
        const pdfData = await pdfParse(file.buffer);
        return pdfData.text;
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docxData = await mammoth.extractRawText({ buffer: file.buffer });
        return docxData.value;
      
      default:
        throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error('Failed to extract text from file');
  }
};

const chunkText = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];
  let start = 0;
  
  // Limit text size to prevent memory issues (max 100,000 characters)
  const maxTextLength = 100000;
  const textToProcess = text.length > maxTextLength ? text.substring(0, maxTextLength) : text;
  
  if (text.length > maxTextLength) {
    console.log(`⚠️ Text truncated from ${text.length} to ${maxTextLength} characters to prevent memory issues`);
  }
  
  while (start < textToProcess.length) {
    const end = Math.min(start + chunkSize, textToProcess.length);
    const chunk = textToProcess.slice(start, end);
    
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
    
    start = end - overlap;
    if (start >= textToProcess.length) break;
    
    // Limit total chunks to 100 max
    if (chunks.length >= 100) {
      console.log(`⚠️ Chunk limit reached (100 chunks)`);
      break;
    }
  }
  
  return chunks;
};

const generateEmbeddings = async (chunks) => {
  const embeddings = [];
  const BATCH_SIZE = 10; // Process 10 chunks at a time
  
  // Limit total chunks to prevent memory issues
  const maxChunks = Math.min(chunks.length, 100);
  const chunksToProcess = chunks.slice(0, maxChunks);
  
  let quotaExceeded = false;
  
  for (let i = 0; i < chunksToProcess.length; i += BATCH_SIZE) {
    const batch = chunksToProcess.slice(i, Math.min(i + BATCH_SIZE, chunksToProcess.length));
    
    // Process batch
    for (let j = 0; j < batch.length; j++) {
      const chunkIndex = i + j;
      
      // Skip if quota already exceeded
      if (quotaExceeded) {
        embeddings.push({
          chunk: batch[j],
          vector: null,
          chunkIndex,
          error: 'Quota exceeded'
        });
        continue;
      }
      
      try {
        const response = await aiService.generateEmbedding(batch[j]);
        
        embeddings.push({
          chunk: batch[j],
          vector: response.embedding,
          chunkIndex
        });
        console.log(`✓ Processed chunk ${chunkIndex + 1}/${chunksToProcess.length}`);
      } catch (error) {
        const isQuotaError = error.message.includes('quota') || error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED');
        
        if (isQuotaError) {
          console.error(`⚠️ Embedding quota exceeded. Remaining chunks will be skipped.`);
          quotaExceeded = true;
        }
        
        console.error(`❌ Failed to generate embedding for chunk ${chunkIndex}:`, error.message);
        embeddings.push({
          chunk: batch[j],
          vector: null,
          chunkIndex,
          error: error.message
        });
      }
    }
    
    // Force garbage collection between batches (if available)
    if (global.gc) {
      global.gc();
    }
    
    // Small delay between batches to allow memory cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const successCount = embeddings.filter(e => e.vector).length;
  if (successCount === 0) {
    console.log(`⚠️ No embeddings generated (0/${chunksToProcess.length}) - quota likely exceeded`);
  } else {
    console.log(`📊 Successfully generated ${successCount}/${chunksToProcess.length} embeddings`);
  }
  
  return embeddings;
};

// Upload text content directly (Teachers only)
router.post('/text/:courseId',
  auth,
  requireTeacher,
  [
    body('title').isLength({ min: 1, max: 200 }).trim(),
    body('content').isLength({ min: 10 }).trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content } = req.body;
      const courseId = req.params.courseId;

      // Verify course ownership
      const course = await Course.findOne({ _id: courseId, teacher: req.user._id });
      if (!course) {
        return res.status(403).json({ error: 'Course not found or access denied' });
      }

      // Create document
      const document = new Document({
        title,
        content,
        course: courseId,
        uploadedBy: req.user._id,
        type: 'text',
        metadata: {
          wordCount: content.split(' ').length,
          language: 'en'
        }
      });

      await document.save();

      // Process embeddings in background
      processDocumentEmbeddings(document._id, content);

      // Generate quiz automatically in background
      generateQuizFromDocument(document._id, courseId, req.user._id, title, content);

      // Add document to course
      course.documents.push(document._id);
      await course.save();

      res.status(201).json({ 
        document,
        message: 'Document uploaded. Quiz generation in progress.' 
      });
    } catch (error) {
      console.error('Text upload error:', error);
      res.status(500).json({ error: 'Failed to upload text' });
    }
  }
);

// Upload file (Teachers only)
router.post('/upload/:courseId',
  auth,
  requireTeacher,
  upload.single('file'),
  [body('title').optional().isLength({ min: 1, max: 200 }).trim()],
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const courseId = req.params.courseId;
      
      // Verify course ownership
      const course = await Course.findOne({ _id: courseId, teacher: req.user._id });
      if (!course) {
        return res.status(403).json({ error: 'Course not found or access denied' });
      }

      // Extract text from file
      console.log(`📄 Extracting text from ${req.file.originalname} (${req.file.mimetype})`);
      const content = await extractTextFromFile(req.file);
      
      if (!content || content.trim().length === 0) {
        console.error(`❌ No readable text found in ${req.file.originalname}`);
        return res.status(400).json({ error: 'No readable text found in the file' });
      }
      
      console.log(`✅ Extracted ${content.length} characters from file`);

      const title = req.body.title || req.file.originalname.split('.')[0];

      // Create document
      const document = new Document({
        title,
        content,
        course: courseId,
        uploadedBy: req.user._id,
        type: 'file',
        originalFile: {
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size
        },
        metadata: {
          wordCount: content.split(' ').length,
          language: 'en'
        }
      });

      await document.save();
      console.log(`✅ Document created with ID: ${document._id}`);

      // Process embeddings in background
      console.log(`🚀 Starting background embedding processing...`);
      processDocumentEmbeddings(document._id, content);

      // Generate quiz automatically in background
      console.log(`🎯 Starting automatic quiz generation...`);
      generateQuizFromDocument(document._id, courseId, req.user._id, title, content);

      // Add document to course
      course.documents.push(document._id);
      await course.save();
      console.log(`✅ Document added to course ${courseId}`);

      res.status(201).json({ 
        document,
        message: 'Document uploaded successfully. Quiz generation in progress.' 
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload file' });
    }
  }
);

// Background function to generate quiz from document
const generateQuizFromDocument = async (documentId, courseId, userId, title, content) => {
  try {
    console.log(`🎲 Generating quiz for document ${documentId}`);
    
    // Check if content is long enough for a quiz
    const wordCount = content.split(' ').length;
    if (wordCount < 100) {
      console.log(`⚠️ Document too short for quiz generation (${wordCount} words)`);
      return;
    }

    // Determine number of questions based on content length
    let numQuestions = 5;
    if (wordCount > 500) numQuestions = 10;
    if (wordCount > 1500) numQuestions = 15;
    if (wordCount > 3000) numQuestions = 20;

    console.log(`📊 Generating ${numQuestions} questions from ${wordCount} words`);

    // Generate quiz using AI
    const questions = await aiService.generateQuiz(content, {
      numQuestions,
      difficulty: 'medium',
      questionTypes: ['multiple-choice']
    });

    // Create quiz
    const quiz = new Quiz({
      userId,
      courseId,
      documentId,
      title: `Quiz: ${title}`,
      description: `Auto-generated quiz from ${title}`,
      sourceText: content.substring(0, 1000), // Store first 1000 chars
      questions,
      difficulty: 'medium',
      category: 'Course Material',
      autoGenerated: true,
      isPublic: false,
      settings: {
        timeLimit: numQuestions * 2, // 2 minutes per question
        randomizeQuestions: true,
        showCorrectAnswers: true
      }
    });

    await quiz.save();
    console.log(`✅ Quiz generated successfully: ${quiz._id} with ${questions.length} questions`);
  } catch (error) {
    console.error(`❌ Failed to generate quiz for document ${documentId}:`, error.message);
    // Don't throw error - quiz generation is optional
  }
};

// Background processing function for embeddings
const processDocumentEmbeddings = async (documentId, content) => {
  try {
    console.log(`🔄 Starting embedding processing for document ${documentId}`);
    const chunks = chunkText(content);
    console.log(`📝 Created ${chunks.length} chunks for processing`);
    
    const embeddings = await generateEmbeddings(chunks);
    const successCount = embeddings.filter(e => e.vector).length;
    console.log(`✅ Generated ${embeddings.length} embeddings (${successCount} successful)`);

    // Only mark as fully processed if at least some embeddings were generated
    const isFullyProcessed = successCount > 0;
    
    await Document.findByIdAndUpdate(documentId, {
      embeddings,
      isProcessed: isFullyProcessed,
      processingError: isFullyProcessed ? null : 'Embedding service quota exceeded'
    });

    if (isFullyProcessed) {
      console.log(`✅ Successfully processed embeddings for document ${documentId}: ${successCount}/${embeddings.length} chunks`);
    } else {
      console.log(`⚠️ Document ${documentId} saved but embeddings failed (quota exceeded). RAG features will be limited.`);
    }
  } catch (error) {
    console.error(`❌ Failed to process embeddings for document ${documentId}:`, error.message);
    // Mark document as failed processing
    await Document.findByIdAndUpdate(documentId, {
      isProcessed: false,
      processingError: error.message
    }).catch(err => console.error('Failed to update document error status:', err));
  }
};

// Get documents for a course
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    
    // Verify user has access to the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const isTeacher = course.teacher.toString() === req.user._id.toString();
    const isStudent = course.students.includes(req.user._id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    const documents = await Document.find({ course: courseId, isActive: true })
      .select('title type createdAt metadata isProcessed originalFile')
      .populate('uploadedBy', 'username profile')
      .sort({ createdAt: -1 });

    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get specific document content
router.get('/:documentId', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId)
      .populate('course')
      .populate('uploadedBy', 'username profile');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access permissions
    const course = document.course;
    const isTeacher = course.teacher.toString() === req.user._id.toString();
    const isStudent = course.students.includes(req.user._id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    res.json({ document });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Get raw document content (for viewing the actual text)
router.get('/:documentId/raw', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId)
      .populate('course')
      .select('title content originalFile course uploadedBy isProcessed processingError');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access permissions
    const course = document.course;
    const isTeacher = course.teacher.toString() === req.user._id.toString();
    const isStudent = course.students.includes(req.user._id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    res.json({ 
      title: document.title,
      content: document.content,
      originalFile: document.originalFile,
      isProcessed: document.isProcessed,
      processingError: document.processingError
    });
  } catch (error) {
    console.error('Get raw document error:', error);
    res.status(500).json({ error: 'Failed to fetch document content' });
  }
});

// Delete document (Teachers only)
router.delete('/:documentId', auth, requireTeacher, async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId)
      .populate('course');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify ownership
    if (document.course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    document.isActive = false;
    await document.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;