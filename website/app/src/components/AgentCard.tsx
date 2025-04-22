import { Agent } from '../types/agent'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(false)
  const [isStarred, setIsStarred] = useState(false)

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getTimeAgo = () => {
    // 模拟创建日期在过去1-6个月之间
    const now = new Date()
    const monthsAgo = Math.floor(Math.random() * 5) + 1 // 1-6个月
    const createdAt = new Date(now.setMonth(now.getMonth() - monthsAgo))
    const diffInDays = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays > 30) {
      const months = Math.floor(diffInDays / 30)
      return `${months}mo`
    }
    return `${diffInDays}d`
  }

  const getPopularity = () => {
    // 如果是trending，返回较高的热度值（85-99）
    if (agent.isTrending) {
      return Math.floor(Math.random() * 15) + 85
    }
    // 否则返回较低的热度值（30-84）
    return Math.floor(Math.random() * 55) + 30
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group border border-gray-100 dark:border-gray-700"
      onClick={() => navigate(`/agent/${agent.username}`)}
    >
      {/* Cover Image */}
      <div className="h-32 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10"></div>
        {/* Star Button */}
        {/* <div
          className="absolute top-3 right-3 cursor-pointer group/star p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation()
            setIsStarred(!isStarred)
          }}
        >
          {isStarred ? (
            <StarIconSolid className="w-5 h-5 text-yellow-400" />
          ) : (
            <StarIcon className="w-5 h-5 text-white hover:text-yellow-400 transition-colors duration-200" />
          )}
        </div> */}
      </div>

      {/* Profile Section */}
      <div className="px-4 pb-4 flex flex-col items-center h-[280px] justify-between">
        {/* Avatar and Name Section */}
        <div className="w-full">
          <div className="relative -mt-12 flex flex-col items-center">
            <img
              src={agent.avatar}
              alt={agent.name}
              className="w-16 h-16 mb-2"
            />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center">
              {agent.name}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              @{agent.username}
            </div>
          </div>

          {/* Bio with max height and scroll */}
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 text-center max-w-sm mx-auto max-h-[60px] overflow-y-auto">
            {agent.description}
          </p>
        </div>

        {/* Stats and Button Contagentner */}
        <div className="w-full space-y-4">
          {/* Stats */}
          {/* <div className="flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-1">
              <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {0}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <ClockIcon className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {getTimeAgo()}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <FireIcon className="w-4 h-4 text-orange-500" />
              <span className={`text-sm ${getPopularity() >= 85 ? 'text-orange-500 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                {getPopularity()}%
              </span>
            </div>
            <div
              className="flex items-center space-x-1 cursor-pointer group/like"
              onClick={(e) => {
                e.stopPropagation()
                setIsLiked(!isLiked)
              }}
            >
              {isLiked ? (
                <HeartIconSolid className="w-4 h-4 text-red-500" />
              ) : (
                <HeartIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover/like:text-red-500 transition-colors" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {Math.floor(Math.random() * 1000).toLocaleString()}
              </span>
            </div>
          </div> */}

          {/* Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/agent/${agent.username}`)
            }}
            className="group relative w-full px-8 py-3 text-sm font-semibold rounded-lg border-2 border-purple-600 bg-white dark:bg-gray-900 transition-all duration-500 ease-in-out overflow-hidden"
          >
            <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:text-white group-hover:text-white transition-colors duration-500">Chat Now</span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-in-out origin-left"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-in-out origin-right delay-100"></div>
          </button>
        </div>
      </div>
    </div>
  )
} 
