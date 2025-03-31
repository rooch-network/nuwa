import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Sidebar } from './components/layout/Sidebar'
import { Home } from './pages/Home'
import { AIStudio } from './pages/AIStudio'
import { CreateAgent } from './pages/CreateAgent'
import { AllAgents } from './pages/AllAgents'
import { ProfileRouter } from './components/profile/ProfileRouter'
import { useState, useEffect, Suspense, lazy } from 'react'
import { DocPage } from './pages/docs/DocPage'
import { Header } from './components/layout/Header'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider, useTheme } from './providers/ThemeProvider'
import { GetRGAS } from './pages/GetRGAS'
import { GetRGASTestnet } from './pages/GetRGASTestNet'
import { RiskWarningModal } from './components/RiskWarningModal'
import { useConnectionStatus } from '@roochnetwork/rooch-sdk-kit'
import { LoadingScreen } from './components/layout/LoadingScreen'
import { NotFound } from './pages/NotFound'
import MobileApp from './mobile/App'

// preload AgentChat component
const AgentChat = lazy(() => import('./pages/AgentChat').then(module => {
  // preload agent data after component is loaded
  const preloadAgent = (id: string) => {
    import('./hooks/use-agent').then(({ default: useAgent }) => {
      useAgent(id);
    });
  };
  return {
    default: module.AgentChat,
    preload: preloadAgent
  };
}));

function AppContent() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const { isDarkMode } = useTheme()
  const location = useLocation()
  const connectionStatus = useConnectionStatus()
  const [showRiskWarning, setShowRiskWarning] = useState(false)
  const isMobile = window.innerWidth <= 768

  if (isMobile) {
    return <MobileApp />;
  }

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Show risk warning when wallet is connected
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const hasSeenWarning = localStorage.getItem('hasSeenRiskWarning')
      if (!hasSeenWarning) {
        setShowRiskWarning(true)
      }
    }
  }, [connectionStatus])

  // preload agent data
  useEffect(() => {
    const agentId = location.pathname.match(/\/agent\/([^\/]+)/)?.[1];
    if (agentId) {
      // @ts-ignore - preload method will be available after component is loaded
      AgentChat.preload?.(agentId);
    }
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <Header isDarkMode={isDarkMode} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden pt-16">
        <Sidebar onCollapse={setIsSidebarCollapsed} isCollapsed={isSidebarCollapsed} />
        <div className={`flex-1 overflow-auto ${isSidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/studio" element={<AIStudio />} />
              <Route path="/studio/create" element={<CreateAgent />} />
              <Route path="/agent/:username/:channelTitle?" element={<AgentChat />} />
              <Route path="/profile/:identifier" element={<ProfileRouter />} />
              <Route path="/allagents" element={<AllAgents />} />
              <Route path="/docs/:docId" element={<DocPage />} />
              <Route path="/getrgas" element={<GetRGAS />} />
              <Route path="/getrgas-testnet" element={<GetRGASTestnet />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </div>

      <RiskWarningModal
        isOpen={showRiskWarning}
        onClose={() => setShowRiskWarning(false)}
      />
    </div>
  )
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <Router>
          <AppContent />
          <Toaster position="top-center" />
        </Router>
      </ThemeProvider>
    </HelmetProvider>
  )
}

export default App
