import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { 
  Home, 
  MessageSquare, 
  FileQuestion, 
  BarChart3, 
  Users, 
  User, 
  Menu,
  X,
  Sun,
  Moon,
  LogOut
} from 'lucide-react'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const getNavigationForRole = (role) => {
    if (role === 'teacher') {
      return [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'My Courses', href: '/teacher/courses', icon: FileQuestion },
        { name: 'Analytics', href: '/teacher/analytics', icon: BarChart3 },
      ]
    } else if (role === 'student') {
      return [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'My Courses', href: '/student/courses', icon: FileQuestion },
        { name: 'Progress', href: '/student/progress', icon: BarChart3 },
      ]
    } else {
      return [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Learn', href: '/learn', icon: MessageSquare },
        { name: 'Quiz', href: '/quiz', icon: FileQuestion },
        { name: 'Progress', href: '/progress', icon: BarChart3 },
        { name: 'Classroom', href: '/classroom', icon: Users },
      ]
    }
  }

  const navigation = getNavigationForRole(user?.role)

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">AI Learn</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-500 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active 
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Link
                to="/profile"
                className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <User className="w-5 h-5" />
                <div className="flex flex-col">
                  <span className="truncate">{user?.username}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role || 'user'}</span>
                </div>
              </Link>
              
              <div className="flex space-x-1">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={Switch to ${theme === 'dark' ? 'light' : 'dark'} mode}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">AI Learn</span>
            </div>
            
            <div className="flex space-x-1">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout