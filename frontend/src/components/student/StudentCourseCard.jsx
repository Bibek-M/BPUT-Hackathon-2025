import { FileText, User, MessageCircle, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

const StudentCourseCard = ({ course }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {course.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
              {course.description}
            </p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>{course.teacher?.username}</span>
              </div>
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                <span>{course.documents?.length || 0} materials</span>
              </div>
            </div>

            {course.documents?.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                <div className="flex items-center text-green-700 dark:text-green-300">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">AI Assistant Available</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Ask questions about the course materials
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <Link
              to={`/student/course/${course._id}`}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 rounded-md transition-colors"
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Study
            </Link>
            {course.documents?.length > 0 && (
              <Link
                to={`/student/course/${course._id}/chat`}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 rounded-md transition-colors"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Ask AI
              </Link>
            )}
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(course.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentCourseCard