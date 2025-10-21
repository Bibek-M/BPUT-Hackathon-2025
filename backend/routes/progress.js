const express = require('express');
const { QuizResult } = require('../models/Quiz');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/progress/dashboard
// @desc    Get user's learning dashboard stats
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user stats
    const user = await User.findById(userId).select('stats createdAt');
    
    // Get recent quiz results (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentQuizResults = await QuizResult.find({
      userId,
      completedAt: { $gte: thirtyDaysAgo }
    })
    .sort({ completedAt: -1 })
    .limit(10)
    .populate('quizId', 'title category difficulty')
    .lean();

    // Get conversation stats
    const conversationStats = await Conversation.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          totalMessages: { $sum: '$stats.totalMessages' },
          totalTokens: { $sum: '$stats.totalTokens' }
        }
      }
    ]);

    // Calculate daily activity for last 30 days
    const dailyActivity = await QuizResult.aggregate([
      {
        $match: {
          userId,
          completedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$completedAt'
            }
          },
          quizzesTaken: { $sum: 1 },
          averageScore: { $avg: '$score' },
          timeSpent: { $sum: '$timeSpent' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get performance by category
    const categoryPerformance = await QuizResult.aggregate([
      {
        $match: { userId }
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: '$quiz' },
      {
        $group: {
          _id: '$quiz.category',
          averageScore: { $avg: '$score' },
          totalQuizzes: { $sum: 1 },
          totalTimeSpent: { $sum: '$timeSpent' }
        }
      },
      { $sort: { averageScore: -1 } }
    ]);

    // Get performance by difficulty
    const difficultyPerformance = await QuizResult.aggregate([
      {
        $match: { userId }
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: '$quiz' },
      {
        $group: {
          _id: '$quiz.difficulty',
          averageScore: { $avg: '$score' },
          totalQuizzes: { $sum: 1 },
          totalTimeSpent: { $sum: '$timeSpent' }
        }
      }
    ]);

    // Calculate learning streak (consecutive days with activity)
    const learningStreak = await calculateLearningStreak(userId);

    const dashboardData = {
      userStats: user.stats,
      accountCreated: user.createdAt,
      recentQuizResults,
      conversationStats: conversationStats[0] || {
        totalConversations: 0,
        totalMessages: 0,
        totalTokens: 0
      },
      dailyActivity,
      categoryPerformance,
      difficultyPerformance,
      learningStreak,
      insights: generateInsights(user.stats, categoryPerformance, difficultyPerformance)
    };

    res.json({ dashboard: dashboardData });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to get dashboard data',
      message: error.message 
    });
  }
});

// @route   GET /api/progress/quiz-history
// @desc    Get detailed quiz history
// @access  Private
router.get('/quiz-history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, difficulty, sortBy = 'completedAt' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { userId: req.user._id };

    // Build aggregation pipeline
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: '$quiz' }
    ];

    // Add category and difficulty filters if specified
    if (category && category !== 'all') {
      pipeline.push({ $match: { 'quiz.category': category } });
    }
    if (difficulty && difficulty !== 'all') {
      pipeline.push({ $match: { 'quiz.difficulty': difficulty } });
    }

    // Add sorting
    const sortField = sortBy === 'score' ? 'score' : 'completedAt';
    pipeline.push({ $sort: { [sortField]: -1 } });

    // Add pagination
    pipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    // Project final fields
    pipeline.push({
      $project: {
        score: 1,
        correctAnswers: 1,
        totalQuestions: 1,
        timeSpent: 1,
        completedAt: 1,
        'quiz.title': 1,
        'quiz.category': 1,
        'quiz.difficulty': 1
      }
    });

    const quizHistory = await QuizResult.aggregate(pipeline);

    // Get total count for pagination
    const totalCount = await QuizResult.countDocuments(filter);

    res.json({
      quizHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount
      }
    });

  } catch (error) {
    console.error('Get quiz history error:', error);
    res.status(500).json({ 
      error: 'Failed to get quiz history',
      message: error.message 
    });
  }
});

// @route   GET /api/progress/learning-trends
// @desc    Get learning trends and analytics
// @access  Private
router.get('/learning-trends', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30' } = req.query; // days
    const daysBack = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Score trends over time
    const scoreTrends = await QuizResult.aggregate([
      {
        $match: {
          userId,
          completedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$completedAt'
            }
          },
          averageScore: { $avg: '$score' },
          quizzesTaken: { $sum: 1 },
          date: { $first: '$completedAt' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Time spent trends
    const timeSpentTrends = await QuizResult.aggregate([
      {
        $match: {
          userId,
          completedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$completedAt'
            }
          },
          totalTimeSpent: { $sum: '$timeSpent' },
          averageTimePerQuiz: { $avg: '$timeSpent' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Conversation activity trends
    const conversationTrends = await Conversation.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          conversationsStarted: { $sum: 1 },
          totalMessages: { $sum: '$stats.totalMessages' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      trends: {
        scoreTrends,
        timeSpentTrends,
        conversationTrends,
        period: daysBack
      }
    });

  } catch (error) {
    console.error('Get learning trends error:', error);
    res.status(500).json({ 
      error: 'Failed to get learning trends',
      message: error.message 
    });
  }
});

// @route   GET /api/progress/achievements
// @desc    Get user achievements and milestones
// @access  Private
router.get('/achievements', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    // Calculate achievements
    const achievements = [];

    // Quiz-based achievements
    if (user.stats.totalQuizzes >= 1) achievements.push({
      id: 'first_quiz',
      title: 'First Steps',
      description: 'Completed your first quiz',
      icon: '🎯',
      unlockedAt: new Date() // In real app, track when achieved
    });

    if (user.stats.totalQuizzes >= 10) achievements.push({
      id: 'quiz_veteran',
      title: 'Quiz Veteran',
      description: 'Completed 10 quizzes',
      icon: '🏆',
      unlockedAt: new Date()
    });

    if (user.stats.averageScore >= 90) achievements.push({
      id: 'perfectionist',
      title: 'Perfectionist',
      description: 'Maintain 90%+ average score',
      icon: '⭐',
      unlockedAt: new Date()
    });

    // Study time achievements
    if (user.stats.studyTime >= 60) achievements.push({
      id: 'dedicated_learner',
      title: 'Dedicated Learner',
      description: 'Studied for over 1 hour',
      icon: '📚',
      unlockedAt: new Date()
    });

    if (user.stats.studyTime >= 300) achievements.push({
      id: 'study_master',
      title: 'Study Master',
      description: 'Studied for over 5 hours',
      icon: '🎓',
      unlockedAt: new Date()
    });

    // Conversation achievements
    if (user.stats.totalMessages >= 10) achievements.push({
      id: 'chatty',
      title: 'Chatty Learner',
      description: 'Sent 10 messages to AI assistant',
      icon: '💬',
      unlockedAt: new Date()
    });

    res.json({ achievements });

  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ 
      error: 'Failed to get achievements',
      message: error.message 
    });
  }
});

// Helper function to calculate learning streak
async function calculateLearningStreak(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let currentDate = new Date(today);
  
  // Check each day going backwards
  for (let i = 0; i < 365; i++) { // Max streak of 365 days
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const hasActivity = await QuizResult.exists({
      userId,
      completedAt: {
        $gte: currentDate,
        $lt: nextDay
      }
    });
    
    if (hasActivity) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

// Helper function to generate insights
function generateInsights(userStats, categoryPerformance, difficultyPerformance) {
  const insights = [];
  
  // Performance insights
  if (userStats.averageScore >= 85) {
    insights.push({
      type: 'positive',
      title: 'Excellent Performance!',
      description: `You're maintaining an impressive ${userStats.averageScore}% average score.`
    });
  } else if (userStats.averageScore < 70) {
    insights.push({
      type: 'suggestion',
      title: 'Room for Improvement',
      description: 'Consider reviewing materials more thoroughly before taking quizzes.'
    });
  }
  
  // Category insights
  if (categoryPerformance.length > 0) {
    const bestCategory = categoryPerformance[0];
    const worstCategory = categoryPerformance[categoryPerformance.length - 1];
    
    if (categoryPerformance.length > 1) {
      insights.push({
        type: 'info',
        title: 'Subject Strength',
        description: `You perform best in ${bestCategory._id} (${Math.round(bestCategory.averageScore)}% avg).`
      });
      
      if (worstCategory.averageScore < 75) {
        insights.push({
          type: 'suggestion',
          title: 'Focus Area',
          description: `Consider spending more time on ${worstCategory._id} topics.`
        });
      }
    }
  }
  
  // Study time insights
  if (userStats.studyTime < 30) {
    insights.push({
      type: 'suggestion',
      title: 'Study More',
      description: 'Try to study for at least 30 minutes to improve retention.'
    });
  }
  
  return insights;
}

module.exports = router;