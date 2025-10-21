import { useState, useRef, useEffect } from 'react'
import { Routes, Route, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  Send,
  Upload,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  Download,
  Copy,
  User,
  Bot
} from 'lucide-react'
import * as chatService from '../services/chatService'
import toast from 'react-hot-toast'

const Learn = () => {
  return (
    <Routes>
      <Route index element={<LearnHome />} />
      <Route path="chat/:sessionId" element={<ChatSession />} />
    </Routes>
  )
}

const LearnHome = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await chatService.getChatSessions()
      setSessions(data.sessions)
    } catch (error) {
      toast.error('Failed to load chat sessions')
    } finally {
      setLoading(false)
    }
  }

  const createNewSession = async () => {
    try {
      const data = await chatService.createChatSession()
      navigate(/learn/chat/${data.session.id})
    } catch (error) {
      toast.error('Failed to create new session')
    }
  }

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return
    
    try {
      await chatService.deleteChatSession(sessionId)
      setSessions(sessions.filter(s => s.id !== sessionId))
      toast.success('Session deleted')
    } catch (error) {
      toast.error('Failed to delete session')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learn with AI</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Ask questions, upload documents, and learn with your AI assistant
          </p>
        </div>
        <button
          onClick={createNewSession}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No chat sessions yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Start your first learning conversation with AI
          </p>
          <button
            onClick={createNewSession}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Start Learning</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {session.title || 'Untitled Session'}
                </h3>
                <button
                  onClick={() => deleteSession(session.id)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {session.lastMessage || 'No messages yet'}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {new Date(session.updatedAt).toLocaleDateString()}
                </span>
                <Link
                  to={/learn/chat/${session.id}}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  Continue →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ChatSession = () => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [contextText, setContextText] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const { user } = useAuth()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Load existing session messages
    setInitialLoading(false)
  }, [])

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file && file.type === 'text/plain') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setContextText(e.target.result)
        toast.success('File uploaded successfully')
      }
      reader.readAsText(file)
    } else {
      toast.error('Please upload a text file')
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await chatService.sendMessage({
        message: userMessage.content,
        context: contextText
      })

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      toast.error('Failed to get AI response')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard')
  }

  if (initialLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full">
      {/* Context Upload Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload Context</span>
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {contextText && (
              <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                <FileText className="w-4 h-4" />
                <span>Context loaded ({contextText.length} chars)</span>
                <button
                  onClick={() => setContextText('')}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Ready to help you learn!
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Ask me anything or upload a document for context-based answers
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}}
              >
                <div className={flex max-w-3xl ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} space-x-3}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-primary-600 text-white ml-3' 
                      : 'bg-gray-200 dark:bg-gray-700 mr-3'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className={`flex-1 px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-sm'
                  }`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    <div className={`flex items-center justify-between mt-2 pt-2 border-t ${
                      message.type === 'user' 
                        ? 'border-primary-500' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}>
                      <span className={`text-xs ${
                        message.type === 'user' 
                          ? 'text-primary-200' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      
                      <button
                        onClick={() => copyMessage(message.content)}
                        className={`p-1 rounded hover:bg-opacity-20 ${
                          message.type === 'user'
                            ? 'text-primary-200 hover:bg-white'
                            : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="flex justify-start">
              <div className="flex space-x-3 max-w-3xl">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                rows="1"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                style={{ minHeight: '50px' }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white p-3 rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Learn