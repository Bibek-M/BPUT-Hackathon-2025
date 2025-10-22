import { useState } from 'react'
import { Users, FileText, Settings, Upload, Eye, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'

const CourseCard = ({ course, onUpdate }) => {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to deactivate this course?')) {
      return
    }

    try {
      setLoading(true)
      await api.delete(`/courses/${course._id}`)
      toast.success('Course deactivated successfully')
      onUpdate()
    } catch (error) {
      console.error('Delete course error:', error)
      toast.error('Failed to deactivate course')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {course.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
              {course.description}
            </p>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{course.students?.length || 0} students</span>
                </div>
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  <span>{course.documents?.length || 0} documents</span>
                </div>
              </div>
              
              {/* Student Names */}
              {course.students && course.students.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Students:</p>
                  <div className="flex flex-wrap gap-1">
                    {course.students.slice(0, 5).map((student) => (
                      <span
                        key={student._id}
                        className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-xs"
                      >
                        {student.username || student.profile?.firstName || 'Unknown'}
                      </span>
                    ))}
                    {course.students.length > 5 && (
                      <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md text-xs">
                        +{course.students.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 rounded px-3 py-1 inline-block text-sm font-mono text-gray-800 dark:text-gray-200 mb-4">
              Code: {course.code}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <Link
              to={`/teacher/course/${course._id}`}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 rounded-md transition-colors"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Link>
            <Link
              to={`/course/${course._id}/upload`}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 rounded-md transition-colors"
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Link>
          </div>
          
          <button
            onClick={handleDelete}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 rounded-md transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CourseCard