const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { rateLimitMiddleware } = require('../middleware/rateLimitHandler');
const aiService = require('../utils/aiService');
const Course = require('../models/Course');
const Document = require('../models/Document');

const router = express.Router();

// Vector similarity calculation
const cosineSimilarity = (vectorA, vectorB) => {
  if (vectorA.length !== vectorB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Find relevant document chunks
const findRelevantChunks = async (courseId, queryEmbedding, topK = 5) => {
  try {
    const documents = await Document.find({
      course: courseId,
      isActive: true,
      isProcessed: true
    }).select('embeddings title');

    const allChunks = [];
    
    documents.forEach(doc => {
      doc.embeddings.forEach(embedding => {
        const similarity = cosineSimilarity(queryEmbedding, embedding.vector);
        allChunks.push({
          chunk: embedding.chunk,
          similarity,
          documentTitle: doc.title,
          documentId: doc._id
        });
      });
    });

    // Sort by similarity and return top K
    return allChunks
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  } catch (error) {
    console.error('Find relevant chunks error:', error);
    return [];
  }
};

// Ask question with RAG
router.post('/ask/:courseId',
  auth,
  rateLimitMiddleware,
  [body('question').isLength({ min: 1, max: 500 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { question } = req.body;
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

      // Try to generate embedding for the question
      let questionEmbedding = null;
      let useHybridMode = false;
      
      try {
        const embeddingResponse = await aiService.generateEmbedding(question);
        if (embeddingResponse === null) {
          // Hybrid mode signal
          useHybridMode = true;
          console.log('🔄 Using hybrid RAG mode (no embeddings)');
        } else {
          questionEmbedding = { data: [{ embedding: embeddingResponse.embedding }] };
        }
      } catch (error) {
        console.error('Embedding generation error:', error);
        const isQuotaError = error.message.includes('quota') || error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED');
        
        if (isQuotaError) {
          // Try hybrid mode as fallback
          useHybridMode = true;
          console.log('⚠️ Embedding quota exceeded, switching to hybrid RAG mode');
        } else {
          return res.status(503).json({
            error: 'Failed to process your question. Please try again later.',
            message: error.message
          });
        }
      }

      // Find relevant chunks (using embeddings or hybrid mode)
      let relevantChunks;
      
      if (useHybridMode) {
        // Get all document chunks for hybrid matching
        const documents = await Document.find({
          course: courseId,
          isActive: true
        }).select('content title');
        
        if (documents.length === 0) {
          return res.json({
            answer: "No documents have been uploaded to this course yet.",
            sources: [],
            confidence: 0,
            mode: 'hybrid'
          });
        }
        
        // Extract chunks from documents
        const allChunks = [];
        documents.forEach(doc => {
          const content = doc.content || '';
          // Simple chunking
          const chunks = content.match(/.{1,1000}/g) || [];
          chunks.forEach(chunk => {
            allChunks.push({
              chunk: chunk.trim(),
              documentTitle: doc.title,
              documentId: doc._id
            });
          });
        });
        
        // Use LLM to find relevant chunks
        try {
          const llmResults = await aiService.findRelevantChunksWithLLM(question, allChunks.map(c => c.chunk), 5);
          relevantChunks = llmResults.map(result => ({
            chunk: result.chunk,
            similarity: result.similarity,
            documentTitle: allChunks[result.index]?.documentTitle || 'Unknown',
            documentId: allChunks[result.index]?.documentId
          }));
        } catch (error) {
          console.error('Hybrid RAG failed:', error);
          // Use first 5 chunks as fallback
          relevantChunks = allChunks.slice(0, 5).map(c => ({ ...c, similarity: 0.5 }));
        }
      } else {
        // Traditional embedding-based search
        relevantChunks = await findRelevantChunks(
          courseId, 
          questionEmbedding.data[0].embedding
        );
      }

      if (relevantChunks.length === 0) {
        return res.json({
          answer: "I don't have enough information from the uploaded documents to answer your question. Please make sure the relevant materials have been uploaded and processed.",
          sources: [],
          confidence: 0
        });
      }

      // Prepare context from relevant chunks
      const context = relevantChunks
        .map(chunk => `From "${chunk.documentTitle}": ${chunk.chunk}`)
        .join('\n\n');

      // Generate answer using AI with context
      let answer;
      try {
        const systemMessage = `You are an AI teaching assistant. Answer the student's question based ONLY on the provided context from the course materials. If the context doesn't contain enough information to answer the question, say so clearly. Be helpful, accurate, and educational.

Context from course materials:
${context}`;

        const response = await aiService.generateResponse([
          {
            role: "user",
            content: question
          }
        ], systemMessage, {
          temperature: 0.7,
          maxTokens: 500
        });

        answer = response.content;
      } catch (error) {
        console.error('AI completion error:', error);
        return res.status(503).json({
          error: 'Failed to generate answer. Please try again later.',
          message: error.message
        });
      }
      
      // Calculate confidence based on similarity scores
      const averageSimilarity = relevantChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / relevantChunks.length;
      const confidence = Math.round(averageSimilarity * 100);

      // Prepare sources
      const sources = relevantChunks.map(chunk => ({
        documentTitle: chunk.documentTitle,
        documentId: chunk.documentId,
        snippet: chunk.chunk.substring(0, 100) + '...',
        similarity: Math.round(chunk.similarity * 100)
      }));

      res.json({
        answer,
        sources,
        confidence,
        question,
        mode: useHybridMode ? 'hybrid' : 'embedding'
      });

    } catch (error) {
      console.error('RAG ask error:', error);
      res.status(500).json({ 
        error: 'Failed to process your question. Please try again.' 
      });
    }
  }
);

// Get similar questions/topics for a course
router.get('/topics/:courseId', auth, async (req, res) => {
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

    // Get processed documents for the course
    const documents = await Document.find({
      course: courseId,
      isActive: true,
      isProcessed: true
    }).select('title metadata.topics');

    const allTopics = [];
    documents.forEach(doc => {
      if (doc.metadata && doc.metadata.topics) {
        allTopics.push(...doc.metadata.topics);
      }
    });

    // Remove duplicates and return
    const uniqueTopics = [...new Set(allTopics)];
    
    // Generate suggested questions based on available content
    const suggestedQuestions = [
      "What are the main topics covered in this course?",
      "Can you explain the key concepts?",
      "What should I know about this subject?",
      "How does this topic relate to other concepts?",
      "Can you provide examples or case studies?"
    ];

    res.json({
      topics: uniqueTopics,
      suggestedQuestions,
      documentsCount: documents.length
    });

  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: 'Failed to fetch course topics' });
  }
});

module.exports = router;