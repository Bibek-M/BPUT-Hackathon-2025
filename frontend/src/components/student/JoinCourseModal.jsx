import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const JoinCourseModal = ({ onClose, onCourseJoined }) => {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) {
      setError('Please enter a course code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post('/courses/join', { code: code.trim() })
      onCourseJoined(response.course)
    } catch (error) {
      console.error('Join course error:', error)
      setError(error.response?.data?.error || 'Failed to join course')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const value = e.target.value.toUpperCase()
    setCode(value)
    if (error) {
      setError('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Join Course
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Code
              </label>
              <input
                type="text"
                value={code}
                onChange={handleChange}
                className={`input text-center font-mono text-lg ${error ? 'border-red-500' : ''}`}
                placeholder="Enter 6-8 digit code"
                maxLength="8"
                required
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Ask your teacher for the course code
              </p>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || !code.trim()}
            >
              {loading ? 'Joining...' : 'Join Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default JoinCourseModal