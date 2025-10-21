import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, MessageCircle, User, BookOpen, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const StudentCourse = () => {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourseData()
  }, [courseId])

  const fetchCourseData = async () => {
    try {
      setLoading(true)
      
      // Fetch course details and documents in parallel
      const [courseResponse, documentsResponse] = await Promise.all([
        api.get(/courses/${courseId}),
        api.get(/documents/course/${courseId})
      ])
      
      setCourse(courseResponse.course)
      setDocuments(documentsResponse.documents || [])
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/"
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {course.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {course.description}
          </p>
        </div>
      </div>

      {/* Course Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Course Information
            </h2>
          </div>
          {documents.length > 0 && (
            <Link
              to={/student/course/${courseId}/chat}
              className="btn-primary flex items-center space-x-2"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Ask AI</span>
            </Link>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Teacher</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {course.teacher?.username || course.teacher?.profile?.firstName || 'Unknown'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <BookOpen className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Course Code</p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">
                  {course.code}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Study Materials</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {documents.length} documents available
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <MessageCircle className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">AI Assistant</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {documents.length > 0 ? 'Available for questions' : 'Waiting for materials'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Study Materials */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Study Materials
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Materials uploaded by your teacher
          </p>
        </div>

        <div className="p-6">
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No materials yet
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Your teacher hasn't uploaded any study materials yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {doc.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {doc.type === 'file' ? 'File' : 'Text'} • {doc.metadata?.wordCount || 0} words • {new Date(doc.createdAt).toLocaleDateString()}
                        {doc.isProcessed && (
                          <span className="ml-2 text-green-600 dark:text-green-400">• AI Ready</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {doc.isProcessed ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Available for AI questions
                      </span>
                    ) : (
                      <span className="text-yellow-600 dark:text-yellow-400">
                        Processing...
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant Promotion */}
      {documents.length > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Ready to Learn?</h3>
              <p className="text-green-100">
                Ask the AI assistant questions about the course materials. Get explanations, examples, and clarifications instantly!
              </p>
            </div>
            <MessageCircle className="h-12 w-12 text-green-200" />
          </div>
          <div className="mt-4">
            <Link
              to={/student/course/${courseId}/chat}
              className="inline-flex items-center px-4 py-2 bg-white text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Start Learning with AI
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentCourse