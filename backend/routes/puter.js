const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const puterService = require('../utils/puterService');

const router = express.Router();

// Check Puter service status
router.get('/status', auth, async (req, res) => {
  try {
    const isAvailable = puterService.isAvailable();
    res.json({ 
      available: isAvailable,
      message: isAvailable ? 'Puter service is active' : 'Puter service is not initialized'
    });
  } catch (error) {
    console.error('Puter status check error:', error);
    res.status(500).json({ error: 'Failed to check Puter status' });
  }
});

// Upload file to Puter cloud
router.post('/storage/upload',
  auth,
  [
    body('fileName').isLength({ min: 1, max: 255 }).trim(),
    body('content').exists(),
    body('path').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fileName, content, path } = req.body;

      const result = await puterService.uploadFile(fileName, content, path || '/');
      
      res.json({
        message: 'File uploaded successfully',
        file: result
      });
    } catch (error) {
      console.error('Puter upload error:', error);
      res.status(500).json({ 
        error: 'Failed to upload file',
        message: error.message
      });
    }
  }
);

// List files from Puter cloud
router.get('/storage/list', auth, async (req, res) => {
  try {
    const path = req.query.path || '/';
    const files = await puterService.listFiles(path);
    
    res.json({
      path,
      files
    });
  } catch (error) {
    console.error('Puter list files error:', error);
    res.status(500).json({ 
      error: 'Failed to list files',
      message: error.message
    });
  }
});

// Read file from Puter cloud
router.get('/storage/read/:filePath(*)', auth, async (req, res) => {
  try {
    const filePath = req.params.filePath;
    const content = await puterService.readFile(filePath);
    
    res.json({
      filePath,
      content
    });
  } catch (error) {
    console.error('Puter read file error:', error);
    res.status(500).json({ 
      error: 'Failed to read file',
      message: error.message
    });
  }
});

// Delete file from Puter cloud
router.delete('/storage/delete/:filePath(*)', auth, async (req, res) => {
  try {
    const filePath = req.params.filePath;
    await puterService.deleteFile(filePath);
    
    res.json({
      message: 'File deleted successfully',
      filePath
    });
  } catch (error) {
    console.error('Puter delete file error:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

// Key-Value storage operations
router.post('/kv/set',
  auth,
  [
    body('key').isLength({ min: 1, max: 255 }).trim(),
    body('value').exists()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { key, value } = req.body;
      await puterService.setValue(key, value);
      
      res.json({
        message: 'Value stored successfully',
        key
      });
    } catch (error) {
      console.error('Puter KV set error:', error);
      res.status(500).json({ 
        error: 'Failed to store value',
        message: error.message
      });
    }
  }
);

router.get('/kv/get/:key', auth, async (req, res) => {
  try {
    const key = req.params.key;
    const value = await puterService.getValue(key);
    
    if (value === null) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    res.json({
      key,
      value
    });
  } catch (error) {
    console.error('Puter KV get error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve value',
      message: error.message
    });
  }
});

router.delete('/kv/delete/:key', auth, async (req, res) => {
  try {
    const key = req.params.key;
    await puterService.deleteValue(key);
    
    res.json({
      message: 'Value deleted successfully',
      key
    });
  } catch (error) {
    console.error('Puter KV delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete value',
      message: error.message
    });
  }
});

module.exports = router;
