import { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  TrendingUp,
  Trophy,
  Clock,
  Target,
  BookOpen,
  Calendar,
  Award,
  Zap
} from 'lucide-react'

const Progress = () => {
  const [timeRange, setTimeRange] = useState('week')
  const [stats, setStats] = useState({
    totalStudyTime: 45.5,
    weeklyGoal: 50,
    quizzesCompleted: 12,
    averageScore: 85,
    streakDays: 7,
    topicsStudied: 8,
    improvement: 15
  })

  // Mock data for charts
  const studyTimeData = [
    { day: 'Mon', hours: 2.5, target: 2 },
    { day: 'Tue', hours: 3.2, target: 2 },
    { day: 'Wed', hours: 1.8, target: 2 },
    { day: 'Thu', hours: 4.1, target: 2 },
    { day: 'Fri', hours: 2.9, target: 2 },
    { day: 'Sat', hours: 3.5, target: 2 },
    { day: 'Sun', hours: 2.1, target: 2 },
  ]

  const quizPerformanceData = [
    { date: '12/10', score: 78 },
    { date: '12/11', score: 82 },
    { date: '12/12', score: 85 },
    { date: '12/13', score: 88 },
    { date: '12/14', score: 91 },
    { date: '12/15', score: 89 },
    { date: '12/16', score: 93 },
  ]

  const topicDistribution = [
    { name: 'JavaScript', value: 35, color: '#3B82F6' },
    { name: 'React', value: 25, color: '#10B981' },
    { name: 'Node.js', value: 20, color: '#F59E0B' },
    { name: 'CSS', value: 12, color: '#EF4444' },
    { name: 'Other', value: 8, color: '#8B5CF6' },
  ]

  const achievements = [
    { 
      id: 1, 
      title: 'Study Streak', 
      description: '7 days in a row!', 
      icon: Zap, 
      color: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20',
      earned: true 
    },
    { 
      id: 2, 
      title: 'Quiz Master', 
      description: 'Completed 10 quizzes', 
      icon: Trophy, 
      color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20',
      earned: true 
    },
    { 
      id: 3, 
      title: 'High Scorer', 
      description: '90%+ on 5 quizzes', 
      icon: Target, 
      color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20',
      earned: false 
    },
    { 
      id: 4, 
      title: 'Knowledge Seeker', 
      description: '50 hours studied', 
      icon: BookOpen, 
      color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20',
      earned: false 
    },
  ]

  const recentActivity = [
    { date: '2 hours ago', activity: 'Completed React Hooks Quiz', score: 92 },
    { date: '1 day ago', activity: 'Studied JavaScript Closures', duration: '45 min' },
    { date: '2 days ago', activity: 'Completed CSS Grid Quiz', score: 88 },
    { date: '3 days ago', activity: 'AI Chat Session on Node.js', duration: '1h 20min' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning Progress</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your learning journey and achievements
          </p>
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Study Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalStudyTime}h
              </p>
              <div className="flex items-center mt-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: ${(stats.totalStudyTime / stats.weeklyGoal) * 100}% }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  /{stats.weeklyGoal}h
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quiz Average</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.averageScore}%
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                +{stats.improvement}% vs last week
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Study Streak</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.streakDays} days
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Keep it up!
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Topics Studied</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.topicsStudied}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This week
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Study Time Chart */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Daily Study Time
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyTimeData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" className="text-gray-600 dark:text-gray-400" />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-color)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="target" fill="#e5e7eb" name="Goal" />
                  <Bar dataKey="hours" fill="#3B82F6" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quiz Performance Chart */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Quiz Performance Trend
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={quizPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" className="text-gray-600 dark:text-gray-400" />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-color)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Topic Distribution */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Study Topics
            </h3>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {topicDistribution.map((entry, index) => (
                      <Cell key={cell-${index}} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {topicDistribution.map((topic, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: topic.color }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {topic.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {topic.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Achievements
            </h3>
            <div className="space-y-4">
              {achievements.map((achievement) => {
                const Icon = achievement.icon
                return (
                  <div 
                    key={achievement.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      achievement.earned ? achievement.color : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      achievement.earned ? achievement.color : 'text-gray-400 bg-gray-200 dark:bg-gray-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        achievement.earned 
                          ? 'text-gray-900 dark:text-white' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {achievement.title}
                      </h4>
                      <p className={`text-xs ${
                        achievement.earned 
                          ? 'text-gray-600 dark:text-gray-300' 
                          : 'text-gray-400'
                      }`}>
                        {achievement.description}
                      </p>
                    </div>
                    {achievement.earned && (
                      <Award className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.activity}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.date}
                      </p>
                      {item.score && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          {item.score}%
                        </span>
                      )}
                      {item.duration && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Progress