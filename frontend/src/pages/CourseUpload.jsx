import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const CourseUpload = () => {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState('file') // 'file' or 'text'
  const [documents, setDocuments] = useState([])
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileTitle, setFileTitle] = useState('')
  
  // Text upload states
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    setSelectedFile(file)
    if (file && !fileTitle) {
      setFileTitle(file.name.split('.')[0])
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (fileTitle) {
        formData.append('title', fileTitle)
      }

      const response = await api.post(/documents/upload/${courseId}, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast.success('File uploaded successfully!')
      setSelectedFile(null)
      setFileTitle('')
      document.getElementById('fileInput').value = ''
      fetchCourseData() // Refresh documents list
    } catch (error) {
      console.error('File upload error:', error)
      toast.error(error.response?.data?.error || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleTextUpload = async (e) => {
    e.preventDefault()
    if (!textTitle.trim() || !textContent.trim()) {
      toast.error('Please provide both title and content')
      return
    }

    setUploading(true)
    try {
      const response = await api.post(/documents/text/${courseId}, {
        title: textTitle.trim(),
        content: textContent.trim()
      })

      toast.success('Text document created successfully!')
      setTextTitle('')
      setTextContent('')
      fetchCourseData() // Refresh documents list
    } catch (error) {
      console.error('Text upload error:', error)
      toast.error(error.response?.data?.error || 'Failed to create text document')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      await api.delete(/documents/${documentId})
      toast.success('Document deleted successfully')
      fetchCourseData() // Refresh documents list
    } catch (error) {
      console.error('Delete document error:', error)
      toast.error('Failed to delete document')
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
            Upload Materials
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {course.title} - Add documents and resources
          </p>
        </div>
      </div>

      {/* Upload Type Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setUploadType('file')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              uploadType === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Upload File
          </button>
          <button
            onClick={() => setUploadType('text')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              uploadType === 'text'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Add Text
          </button>
        </div>

        {/* File Upload Form */}
        {uploadType === 'file' && (
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select File
              </label>
              <input
                id="fileInput"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.docx,.txt"
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-blue-900 dark:file:text-blue-200"
                disabled={uploading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Supported formats: PDF, DOCX, TXT (max 10MB)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Document Title (optional)
              </label>
              <input
                type="text"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                className="input"
                placeholder="Leave blank to use filename"
                disabled={uploading}
              />
            </div>

            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="btn-primary disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </form>
        )}

        {/* Text Upload Form */}
        {uploadType === 'text' && (
          <form onSubmit={handleTextUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Document Title
              </label>
              <input
                type="text"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                className="input"
                placeholder="Enter document title"
                required
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="input"
                rows={10}
                placeholder="Enter document content..."
                required
                disabled={uploading}
              />
            </div>

            <button
              type="submit"
              disabled={!textTitle.trim() || !textContent.trim() || uploading}
              className="btn-primary disabled:opacity-50"
            >
              {uploading ? 'Creating...' : 'Create Document'}
            </button>
          </form>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Uploaded Documents ({documents.length})
          </h2>
        </div>

        <div className="p-6">
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No documents yet
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Upload your first document to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {doc.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {doc.type} • {doc.metadata?.wordCount || 0} words • {new Date(doc.createdAt).toLocaleDateString()}
                        {doc.isProcessed && (
                          <span className="ml-2 inline-flex items-center">
                            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                            <span className="text-green-600">AI Ready</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc._id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CourseUpload