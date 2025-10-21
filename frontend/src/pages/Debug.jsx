import { useAuth } from '../contexts/AuthContext'

const Debug = () => {
  const { user, isAuthenticated, loading } = useAuth()
  
  return (
    <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      
      <div className="space-y-4">
        <div>
          <strong>Loading:</strong> {loading ? 'true' : 'false'}
        </div>
        
        <div>
          <strong>Is Authenticated:</strong> {isAuthenticated ? 'true' : 'false'}
        </div>
        
        <div>
          <strong>User Object:</strong>
          <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-700 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>User Role:</strong> {user?.role || 'undefined'}
        </div>
        
        <div>
          <strong>Local Storage Token:</strong> 
          <span className="ml-2 text-sm">
            {localStorage.getItem('token') ? 'Present' : 'Not found'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default Debug