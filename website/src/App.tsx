import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Sidebar } from './components/Sidebar'
import { Home } from './pages/Home'
import { AgentChat } from './pages/AgentChat'
import { AIStudio } from './pages/AIStudio'
import { CreateAgent } from './pages/CreateAgent'
import { AllAgents } from './pages/AllAgents'
import { ProfileRouter } from './components/ProfileRouter'
import { useState, useEffect } from 'react'
import { DocPage } from './pages/docs/DocPage'
import { NewPage } from './pages/NewPage'
import { Header } from './components/Header'
import { HelmetProvider } from 'react-helmet-async'

function AppContent() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const location = useLocation()

  // 监听路由变化，滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Check if sidebar should be collapsed when route changes
  useEffect(() => {
    const shouldCollapse = location.pathname.startsWith('/agent/') || location.pathname.startsWith('/docs/')
    setIsSidebarCollapsed(shouldCollapse)
  }, [location.pathname])

  // Check dark mode
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)
  }, [])

  // Listen for dark mode changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'))
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isDarkMode={isDarkMode} />

      {/* Main Content */}
      <div className="flex flex-1 pt-16">
        <Sidebar onCollapse={setIsSidebarCollapsed} isCollapsed={isSidebarCollapsed} />
        <div className={`flex-1 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<NewPage />} />
            <Route path="/studio" element={<AIStudio />} />
            <Route path="/studio/create" element={<CreateAgent />} />
            <Route path="/agent/:agentname" element={<AgentChat />} />
            <Route path="/profile/:username" element={<ProfileRouter />} />
            <Route path="/allagents" element={<AllAgents />} />
            <Route path="/docs/:docId" element={<DocPage />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AppContent />
        <Toaster position="bottom-right" />
      </Router>
    </HelmetProvider>
  )
}

export default App
