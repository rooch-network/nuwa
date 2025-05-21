import { useState, useEffect } from 'react'
import { SupabaseAuthService } from './services/supabaseService'
import Auth from './components/Auth'
import AgentDIDCreator from './components/AgentDIDCreator'
import './App.css'

function App() {
  const [userHash, setUserHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const authService = new SupabaseAuthService()

  // Check if user is logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true)
        const user = await authService.getCurrentUser()
        if (user) {
          const hash = await authService.getUserIdentifierHash()
          setUserHash(hash)
        }
      } catch (error) {
        console.error('Failed to check session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  // Handle successful authentication
  const handleAuthSuccess = (hash: string) => {
    setUserHash(hash)
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.signOut()
      setUserHash(null)
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  if (loading) {
    return <div className="app-container loading">Loading...</div>
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Custodian Service</h1>
        {userHash && (
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        )}
      </header>

      <main className="app-main">
        {!userHash ? (
          <Auth onSuccess={handleAuthSuccess} />
        ) : (
          <AgentDIDCreator userHash={userHash} />
        )}
      </main>

      <footer className="app-footer">
        <p>Custodian Service based on NIP-3</p>
      </footer>
    </div>
  )
}

export default App
