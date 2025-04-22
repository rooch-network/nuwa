export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
          <span>© Copyright 2025 Root Branch Labs, LTD.</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <a
            href="https://github.com/rooch-network/nuwa"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
} 