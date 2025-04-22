import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { SEO } from '../components/layout/SEO'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { UserProfilePanel } from '../components/profile/UserProfilePanel'
import { UserPortfolioPanel } from '../components/profile/UserPortfolioPanel'

interface UserProfileProps {
  address: string
}

export const UserProfile = ({ address }: UserProfileProps) => {
  const navigate = useNavigate()

  return (
    <>
      <SEO
        title="Profile"
        description="Manage your Nuwa account on Rooch, view your AI agents, and track your interactions with autonomous AI agents on the blockchain."
        keywords="User Profile, Nuwa Account, AI Agent Management, Blockchain AI, User Dashboard"
      />
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              <span>Back</span>
            </button>
          </div>

          {/* Profile Panel */}
          <UserProfilePanel
            address={address}
          />

          {/* Portfolio Panel */}
          <UserPortfolioPanel
            address={address}
          />
        </div>
      </div>
    </>
  )
} 