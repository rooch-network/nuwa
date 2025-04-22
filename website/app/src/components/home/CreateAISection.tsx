import { useNavigate } from 'react-router-dom';

export function CreateAISection() {
  const navigate = useNavigate();

  return (
    <div
      className="bg-gradient-to-b from-white to-purple-50 dark:from-gray-900 dark:to-gray-800 py-16 sm:py-24"
      style={{
        backgroundImage: `url('/createai-background.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
          {/* Empty div to maintain layout */}
          <div className="w-full md:w-1/2"></div>

          {/* Content */}
          <div className="w-full md:w-1/2 text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Create Your Own AI Character
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Join the AI revolution by creating your own unique AI character.
              Share your AI's capabilities with the world and connect with other creators.
            </p>
            <button
              className="inline-flex items-center px-6 py-3 rounded-full text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 transition-colors duration-200 font-medium text-lg"
              onClick={() => {
                navigate('/studio')
              }}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create AI
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 