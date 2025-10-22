import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const AIChat = ({ courseId, courseName }) => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'ai',
      content: `Hi! I'm your AI learning assistant for "${courseName}". I can help answer questions about the course materials that have been uploaded. What would you like to know?`,
      timestamp: new Date(),
    }
  ])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setQuestion('')
    setIsLoading(true)

    try {
      const response = await api.post(`/rag/ask/${courseId}`, {
        question: question.trim()
      })

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.answer,
        confidence: response.confidence,
        sources: response.sources,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: error.response?.data?.error || 'Sorry, I encountered an error processing your question. Please try again.',
        isError: true,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <Bot className="h-6 w-6 text-blue-600 mr-3" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Learning Assistant
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ask questions about {courseName}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-3xl ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-3' : 'mr-3'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-blue-600' 
                    : message.isError 
                    ? 'bg-red-600' 
                    : 'bg-gray-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : message.isError ? (
                    <AlertCircle className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
              
              <div className={`px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.isError
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {/* Confidence and sources for AI messages */}
                {message.type === 'ai' && !message.isError && message.confidence && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Confidence: {message.confidence}%
                      </span>
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Sources:
                        </p>
                        <div className="space-y-1">
                          {message.sources.slice(0, 3).map((source, idx) => (
                            <div key={idx} className="text-xs text-gray-500 dark:text-gray-500">
                              <span className="font-medium">{source.documentTitle}</span>
                              <span className="ml-1">({source.similarity}% match)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex mr-3">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about the course materials..."
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  )
}

export default AIChat