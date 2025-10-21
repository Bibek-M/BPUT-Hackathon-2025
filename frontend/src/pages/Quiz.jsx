import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  FileQuestion,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Trophy,
  Target
} from 'lucide-react'
import toast from 'react-hot-toast'

const Quiz = () => {
  return (
    <Routes>
      <Route index element={<QuizHome />} />
      <Route path="take/:quizId" element={<TakeQuiz />} />
      <Route path="result/:resultId" element={<QuizResult />} />
    </Routes>
  )
}

const QuizHome = () => {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadQuizzes()
  }, [])

  const loadQuizzes = async () => {
    try {
      // Mock data for now
      setQuizzes([
        { id: 1, title: 'JavaScript Basics', questions: 10, completed: true, score: 85, createdAt: new Date() },
        { id: 2, title: 'React Components', questions: 8, completed: false, createdAt: new Date() },
      ])
    } catch (error) {
      toast.error('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI-Generated Quizzes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Test your knowledge with custom quizzes generated from your study materials
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Quiz</span>
        </button>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-12">
          <FileQuestion className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No quizzes yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Upload study materials to generate your first quiz
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Quiz</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  {quiz.title}
                </h3>
                {quiz.completed && (
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">{quiz.score}%</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center space-x-1">
                  <FileQuestion className="w-4 h-4" />
                  <span>{quiz.questions} questions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{quiz.questions * 1.5} min</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {new Date(quiz.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => navigate(/quiz/take/${quiz.id})}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
                >
                  <span>{quiz.completed ? 'Retake' : 'Start'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateQuizModal 
          onClose={() => setShowCreateModal(false)}
          onCreated={(quiz) => {
            setQuizzes(prev => [quiz, ...prev])
            setShowCreateModal(false)
            navigate(/quiz/take/${quiz.id})
          }}
        />
      )}
    </div>
  )
}

const CreateQuizModal = ({ onClose, onCreated }) => {
  const [text, setText] = useState('')
  const [numQuestions, setNumQuestions] = useState(10)
  const [difficulty, setDifficulty] = useState('medium')
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file && file.type === 'text/plain') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setText(e.target.result)
        toast.success('File uploaded successfully')
      }
      reader.readAsText(file)
    } else {
      toast.error('Please upload a text file')
    }
  }

  const createQuiz = async () => {
    if (!text.trim()) {
      toast.error('Please provide study material')
      return
    }

    setLoading(true)
    try {
      // Mock quiz creation
      const newQuiz = {
        id: Date.now(),
        title: 'Custom Quiz',
        questions: numQuestions,
        completed: false,
        createdAt: new Date()
      }
      onCreated(newQuiz)
    } catch (error) {
      toast.error('Failed to create quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Create AI Quiz
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Study Material
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your study material here or upload a file..."
                rows="8"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              
              <div className="mt-2">
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="quiz-file-upload"
                />
                <label
                  htmlFor="quiz-file-upload"
                  className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Text File</span>
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Questions
                </label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-4 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createQuiz}
              disabled={loading || !text.trim()}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>Generate Quiz</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const TakeQuiz = () => {
  const { quizId } = useParams()
  const [quiz, setQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutes
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Mock quiz data
  const mockQuiz = {
    id: quizId,
    title: 'JavaScript Basics',
    questions: [
      {
        id: 1,
        question: 'What is the correct way to declare a variable in JavaScript?',
        options: ['var myVar = 5;', 'variable myVar = 5;', 'v myVar = 5;', 'declare myVar = 5;'],
        correct: 0
      },
      {
        id: 2,
        question: 'Which method is used to add an element to the end of an array?',
        options: ['append()', 'push()', 'add()', 'insert()'],
        correct: 1
      }
    ]
  }

  useEffect(() => {
    // Load quiz data
    setQuiz(mockQuiz)
    setLoading(false)
  }, [quizId])

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      submitQuiz()
    }
  }, [timeLeft])

  const handleAnswerSelect = (optionIndex) => {
    setAnswers({
      ...answers,
      [currentQuestion]: optionIndex
    })
  }

  const nextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const submitQuiz = async () => {
    try {
      // Calculate score
      let correct = 0
      quiz.questions.forEach((q, index) => {
        if (answers[index] === q.correct) correct++
      })
      
      const score = Math.round((correct / quiz.questions.length) * 100)
      navigate(/quiz/result/${quizId}, { state: { score, correct, total: quiz.questions.length } })
    } catch (error) {
      toast.error('Failed to submit quiz')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return ${mins}:${secs.toString().padStart(2, '0')}
  }

  if (loading) return <LoadingSpinner />

  const question = quiz.questions[currentQuestion]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{quiz.title}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </p>
          </div>
          
          <div className="text-right">
            <div className={text-2xl font-mono ${timeLeft < 300 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Time remaining</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: ${((currentQuestion + 1) / quiz.questions.length) * 100}% }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {question.question}
        </h2>
        
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                answers[currentQuestion] === index
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  answers[currentQuestion] === index
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300 dark:border-gray-500'
                }`}>
                  {answers[currentQuestion] === index && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="text-gray-900 dark:text-white">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>
        
        <div className="flex space-x-4">
          {currentQuestion === quiz.questions.length - 1 ? (
            <button
              onClick={submitQuiz}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const QuizResult = () => {
  const { resultId } = useParams()
  const navigate = useNavigate()
  const result = history.state?.usr || { score: 85, correct: 8, total: 10 }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreMessage = (score) => {
    if (score >= 90) return 'Excellent work! 🎉'
    if (score >= 80) return 'Great job! 👏'
    if (score >= 70) return 'Good effort! 👍'
    if (score >= 60) return 'Keep practicing! 💪'
    return 'Study more and try again! 📚'
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="mb-8">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Quiz Completed!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {getScoreMessage(result.score)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 mb-8">
          <div className={text-6xl font-bold mb-2 ${getScoreColor(result.score)}}>
            {result.score}%
          </div>
          
          <div className="text-gray-600 dark:text-gray-400 mb-6">
            You got {result.correct} out of {result.total} questions correct
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {result.correct}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Correct</div>
            </div>
            
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {result.total - result.correct}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">Incorrect</div>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {result.total}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Total</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/quiz')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Back to Quizzes
          </button>
          
          <button
            onClick={() => navigate(/quiz/take/${resultId})}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake Quiz</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Quiz