const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Course = require('../models/Course');
const Document = require('../models/Document');
const User = require('../models/User');

const router = express.Router();

console.log('🏫 Course routes module loaded');

// Debug route to test auth
router.get('/debug', auth, (req, res) => {
  res.json({
    user: req.user,
    userId: req.user._id,
    role: req.user.role
  });
});

// Middleware to check if user is a teacher
const requireTeacher = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teacher role required.' });
  }
  next();
};

// Create a new course (Teachers only)
router.post('/', auth, requireTeacher, [
  body('title').isLength({ min: 3, max: 100 }).trim(),
  body('description').isLength({ min: 10, max: 500 }).trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description } = req.body;
    
    const course = new Course({
      title,
      description,
      teacher: req.user._id
    });

    await course.save();
    await course.populate('teacher', 'username profile');

    res.status(201).json({ course });
  } catch (error) {
    console.error('Course creation error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Get teacher's courses
router.get('/my-courses', auth, requireTeacher, async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id })
      .populate('teacher', 'username profile')
      .populate('students', 'username profile')
      .sort({ createdAt: -1 });

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get student's enrolled courses
router.get('/enrolled', auth, async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user._id, isActive: true })
      .populate('teacher', 'username profile')
      .populate('documents', 'title type createdAt')
      .sort({ createdAt: -1 });

    res.json({ courses });
  } catch (error) {
    console.error('Get enrolled courses error:', error);
    res.status(500).json({ error: 'Failed to fetch enrolled courses' });
  }
});

// Join a course using course code (Students only)
router.post('/join',
  auth,
  [body('code').isLength({ min: 6, max: 8 }).trim().toUpperCase()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code } = req.body;
      
      const course = await Course.findOne({ code, isActive: true })
        .populate('teacher', 'username profile');

      if (!course) {
        return res.status(404).json({ error: 'Course not found or inactive' });
      }

      // Check if student is already enrolled
      if (course.students.includes(req.user._id)) {
        return res.status(400).json({ error: 'Already enrolled in this course' });
      }

      // Check max students limit
      if (course.students.length >= course.settings.maxStudents) {
        return res.status(400).json({ error: 'Course is full' });
      }

      course.students.push(req.user._id);
      await course.save();

      await course.populate('students', 'username profile');

      res.json({ message: 'Successfully joined course', course });
    } catch (error) {
      console.error('Join course error:', error);
      res.status(500).json({ error: 'Failed to join course' });
    }
  }
);

// Get course details
router.get('/:courseId', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate('teacher', 'username profile')
      .populate('students', 'username profile')
      .populate('documents', 'title type createdAt metadata');

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user has access to this course
    const isTeacher = course.teacher._id.toString() === req.user._id.toString();
    const isStudent = course.students.some(student => student._id.toString() === req.user._id.toString());

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
});

// Update course (Teachers only)
router.put('/:courseId',
  auth,
  requireTeacher,
  [
    body('title').optional().isLength({ min: 3, max: 100 }).trim(),
    body('description').optional().isLength({ min: 10, max: 500 }).trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const course = await Course.findOne({ 
        _id: req.params.courseId, 
        teacher: req.user._id 
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found or access denied' });
      }

      Object.keys(req.body).forEach(key => {
        if (key !== 'teacher' && key !== 'code') {
          course[key] = req.body[key];
        }
      });

      await course.save();
      await course.populate('teacher', 'username profile');

      res.json({ course });
    } catch (error) {
      console.error('Update course error:', error);
      res.status(500).json({ error: 'Failed to update course' });
    }
  }
);

// Delete/Deactivate course (Teachers only)
router.delete('/:courseId', auth, requireTeacher, async (req, res) => {
  try {
    const course = await Course.findOne({ 
      _id: req.params.courseId, 
      teacher: req.user._id 
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    course.isActive = false;
    await course.save();

    res.json({ message: 'Course deactivated successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to deactivate course' });
  }
});

module.exports = router;