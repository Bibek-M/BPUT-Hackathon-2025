const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { auth } = require('../middleware/auth');
const aiService = require('../utils/aiService');
const Course = require('../models/Course');
const Document = require('../models/Document');

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
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
    
    start = end - overlap;
    if (start >= text.length) break;
  }
  
  return chunks;
};

const generateEmbeddings = async (chunks) => {
  const embeddings = [];
  
  for (let i = 0; i < chunks.length; i++) {
    try {
      const response = await aiService.generateEmbedding(chunks[i]);
      
      embeddings.push({
        chunk: chunks[i],
        vector: response.embedding,
        chunkIndex: i
      });
    } catch (error) {
      console.error(`Failed to generate embedding for chunk ${i}:`, error);
      // Continue with other chunks even if one fails
    }
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

      // Add document to course
      course.documents.push(document._id);
      await course.save();

      res.status(201).json({ document });
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
      const content = await extractTextFromFile(req.file);
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'No readable text found in the file' });
      }

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

      // Process embeddings in background
      processDocumentEmbeddings(document._id, content);

      // Add document to course
      course.documents.push(document._id);
      await course.save();

      res.status(201).json({ document });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload file' });
    }
  }
);

// Background processing function for embeddings
const processDocumentEmbeddings = async (documentId, content) => {
  try {
    const chunks = chunkText(content);
    const embeddings = await generateEmbeddings(chunks);

    await Document.findByIdAndUpdate(documentId, {
      embeddings,
      isProcessed: true
    });

    console.log(`Processed embeddings for document ${documentId}: ${embeddings.length} chunks`);
  } catch (error) {
    console.error(`Failed to process embeddings for document ${documentId}:`, error);
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