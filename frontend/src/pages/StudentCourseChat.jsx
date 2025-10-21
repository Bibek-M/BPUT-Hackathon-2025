import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import AIChat from '../components/student/AIChat'

const StudentCourseChat = () => {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourseData()
  }, [courseId])

  const fetchCourseData = async () => {
    try {
      setLoading(true)
      const response = await api.get(/courses/${courseId})
      setCourse(response.course)
    } catch (error) {
      console.error('Failed to fetch course data:', error)
      toast.error('Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          Course not found
        </h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          The course you're looking for doesn't exist or you don't have access to it.
        </p>
        <Link to="/" className="btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to={/student/course/${courseId}}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Learning Assistant
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {course.title} - Ask questions about the course materials
          </p>
        </div>
      </div>

      {/* AI Chat Component */}
      <div className="flex-1 min-h-0">
        <AIChat courseId={courseId} courseName={course.title} />
      </div>
    </div>
  )
}

export default StudentCourseChat