import { Link } from 'react-router-dom'

export function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">Can't find the page you're looking for</p>
                <Link
                    to="/"
                    className="group relative px-8 py-3 text-lg font-semibold rounded-full border-2 border-purple-600 hover:border-transparent transition-all duration-500 ease-in-out overflow-hidden bg-white dark:bg-gray-900 inline-block"
                >
                    <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 group-hover:text-white transition-colors duration-500">Back to Home</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-in-out origin-left"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-in-out origin-right delay-100"></div>
                </Link>
            </div>
        </div>
    )
} 