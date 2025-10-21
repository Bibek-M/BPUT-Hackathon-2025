import { useState, useEffect } from 'react'
import { Plus, BookOpen, MessageCircle, Search, Brain } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import JoinCourseModal from '../components/student/JoinCourseModal'
import StudentCourseCard from '../components/student/StudentCourseCard'
import toast from 'react-hot-toast'
import api from '../services/api'

const StudentDashboard = () => {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalDocuments: 0,
    questionsAsked: 0
  })

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await api.get('/courses/enrolled')
      setCourses(response.courses || [])
      
      // Calculate stats
      const courses = response.courses || []
      const totalDocuments = courses.reduce((sum, course) => sum + (course.documents?.length || 0), 0)
      
      setStats({
        totalCourses: courses.length,
        totalDocuments,
        questionsAsked: 0 // TODO: Track this in user stats
      })
    } catch (error) {
      console.error('Failed to fetch courses:', error)
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleCourseJoined = (newCourse) => {
    setCourses(prev => [newCourse, ...prev])
    setStats(prev => ({
      ...prev,
      totalCourses: prev.totalCourses + 1,
      totalDocuments: prev.totalDocuments + (newCourse.documents?.length || 0)
    }))
    setShowJoinModal(false)
    toast.success('Successfully joined course!')
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Student Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, {user?.profile?.firstName || user?.username}! Ready to learn?
          </p>
        </div>
        <button
          onClick={() => setShowJoinModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Join Course</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Enrolled Courses
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalCourses}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Search className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Study Materials
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalDocuments}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                AI Assistant
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                Ready to help
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Quick Access */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">AI Learning Assistant</h3>
            <p className="text-blue-100">
              Ask questions about your course materials and get instant, intelligent answers
            </p>
          </div>
          <MessageCircle className="h-12 w-12 text-blue-200" />
        </div>
        <div className="mt-4">
          <p className="text-sm text-blue-100">
            💡 Try asking: "What are the key concepts in this course?" or "Can you explain this topic?"
          </p>
        </div>
      </div>

      {/* Courses Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            My Courses
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Access your enrolled courses and study materials
          </p>
        </div>

        <div className="p-6">
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No courses enrolled yet
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Join your first course to start learning with AI assistance
              </p>
              <button
                onClick={() => setShowJoinModal(true)}
                className="btn-primary mt-4"
              >
                Join Course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <StudentCourseCard
                  key={course._id}
                  course={course}
                  onUpdate={fetchCourses}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity or Tips */}
      {courses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Learning Tips
          </h3>
          <div className="space-y-3 text-gray-600 dark:text-gray-400">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <p>Ask specific questions about the course materials for better AI responses</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <p>Use the AI assistant to clarify complex concepts and get examples</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <p>Review source documents to dive deeper into topics</p>
            </div>
          </div>
        </div>
      )}

      {/* Join Course Modal */}
      {showJoinModal && (
        <JoinCourseModal
          onClose={() => setShowJoinModal(false)}
          onCourseJoined={handleCourseJoined}
        />
      )}
    </div>
  )
}

export default StudentDashboard