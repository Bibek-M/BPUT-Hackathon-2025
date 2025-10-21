import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  Users,
  Plus,
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Settings,
  Crown,
  UserPlus,
  Copy,
  ExternalLink
} from 'lucide-react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const Classroom = () => {
  return (
    <Routes>
      <Route index element={<ClassroomHome />} />
      <Route path="room/:roomId" element={<ClassroomRoom />} />
    </Routes>
  )
}

const ClassroomHome = () => {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadRooms()
  }, [])

  const loadRooms = async () => {
    try {
      // Mock data for now
      setRooms([
        {
          id: '1',
          name: 'JavaScript Study Group',
          description: 'Weekly discussion about JS concepts',
          participants: 8,
          maxParticipants: 20,
          isActive: true,
          createdBy: 'john_doe',
          createdAt: new Date()
        },
        {
          id: '2',
          name: 'React Developers',
          description: 'Learning React together',
          participants: 5,
          maxParticipants: 15,
          isActive: false,
          createdBy: 'jane_smith',
          createdAt: new Date()
        }
      ])
    } catch (error) {
      toast.error('Failed to load classrooms')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Virtual Classrooms</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Join study groups and collaborate with other learners in real-time
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Room</span>
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No classrooms yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create your first study room and start collaborating
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Room</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {room.name}
                    </h3>
                    {room.isActive && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {room.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>{room.participants}/{room.maxParticipants}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Crown className="w-3 h-3" />
                  <span className="text-xs">{room.createdBy}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {new Date(room.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => navigate(/classroom/room/${room.id})}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    room.isActive
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  {room.isActive ? 'Join Live' : 'Enter Room'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateRoomModal 
          onClose={() => setShowCreateModal(false)}
          onCreated={(room) => {
            setRooms(prev => [room, ...prev])
            setShowCreateModal(false)
            navigate(/classroom/room/${room.id})
          }}
        />
      )}
    </div>
  )
}

const CreateRoomModal = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxParticipants: 20,
    isPrivate: false
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Room name is required')
      return
    }

    setLoading(true)
    try {
      // Mock room creation
      const newRoom = {
        id: Date.now().toString(),
        ...formData,
        participants: 1,
        isActive: true,
        createdBy: 'current_user',
        createdAt: new Date()
      }
      onCreated(newRoom)
    } catch (error) {
      toast.error('Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Create Study Room
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter room name..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="3"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="What will you be studying?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Participants
              </label>
              <select
                value={formData.maxParticipants}
                onChange={(e) => setFormData({...formData, maxParticipants: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={5}>5 People</option>
                <option value={10}>10 People</option>
                <option value={20}>20 People</option>
                <option value={50}>50 People</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                id="private-room"
                type="checkbox"
                checked={formData.isPrivate}
                onChange={(e) => setFormData({...formData, isPrivate: e.target.checked})}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="private-room" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Private room (invite-only)
              </label>
            </div>
          </form>
          
          <div className="flex items-center justify-end space-x-4 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.name.trim()}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>Create Room</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ClassroomRoom = () => {
  const { roomId } = useParams()
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [messages, setMessages] = useState([])
  const [participants, setParticipants] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)
  const [mediaState, setMediaState] = useState({
    audio: false,
    video: false,
    screen: false
  })
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000', {
      auth: {
        userId: user?.id,
        username: user?.username,
        roomId
      }
    })

    setSocket(newSocket)

    // Socket event listeners
    newSocket.on('connect', () => {
      setIsConnected(true)
      toast.success('Connected to classroom')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      toast.error('Disconnected from classroom')
    })

    newSocket.on('room-info', (info) => {
      setRoomInfo(info)
    })

    newSocket.on('participants-update', (participantsList) => {
      setParticipants(participantsList)
    })

    newSocket.on('message-received', (message) => {
      setMessages(prev => [...prev, message])
    })

    newSocket.on('user-joined', (data) => {
      toast.success(${data.username} joined the room)
    })

    newSocket.on('user-left', (data) => {
      toast(${data.username} left the room, { icon: '👋' })
    })

    return () => {
      newSocket.disconnect()
    }
  }, [roomId, user])

  const sendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket) return

    const message = {
      id: Date.now(),
      text: newMessage.trim(),
      sender: {
        id: user.id,
        username: user.username
      },
      timestamp: new Date()
    }

    socket.emit('send-message', message)
    setMessages(prev => [...prev, message])
    setNewMessage('')
  }

  const toggleMedia = (type) => {
    setMediaState(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
    
    // In a real app, this would toggle actual media devices
    toast.info(${type.charAt(0).toUpperCase() + type.slice(1)} ${mediaState[type] ? 'disabled' : 'enabled'})
  }

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave-room')
    }
    navigate('/classroom')
  }

  const copyRoomLink = () => {
    const link = ${window.location.origin}/classroom/room/${roomId}
    navigator.clipboard.writeText(link)
    toast.success('Room link copied to clipboard')
  }

  if (!roomInfo) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {roomInfo.name}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span className={flex items-center space-x-1 ${isConnected ? 'text-green-600' : 'text-red-600'}}>
                  <div className={w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}} />
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </span>
                <span>{participants.length} participants</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={copyRoomLink}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Copy room link"
              >
                <Copy className="w-4 h-4" />
              </button>
              
              <button
                onClick={leaveRoom}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Leave</span>
              </button>
            </div>
          </div>
        </div>

        {/* Video/Screen Sharing Area */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-4">
          <div className="h-full bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Video sharing will be available soon
              </p>
            </div>
          </div>
        </div>

        {/* Media Controls */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => toggleMedia('audio')}
              className={`p-3 rounded-full transition-colors ${
                mediaState.audio
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
              title={${mediaState.audio ? 'Mute' : 'Unmute'} microphone}
            >
              {mediaState.audio ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => toggleMedia('video')}
              className={`p-3 rounded-full transition-colors ${
                mediaState.video
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
              title={${mediaState.video ? 'Stop' : 'Start'} video}
            >
              {mediaState.video ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => toggleMedia('screen')}
              className={`p-3 rounded-full transition-colors ${
                mediaState.screen
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
              title={${mediaState.screen ? 'Stop' : 'Start'} screen sharing}
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Participants */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">
            Participants ({participants.length})
          </h3>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {participant.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {participant.username}
                </span>
                {participant.isHost && (
                  <Crown className="w-3 h-3 text-yellow-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="group">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">
                      {message.sender.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {message.sender.username}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {message.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={sendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Classroom