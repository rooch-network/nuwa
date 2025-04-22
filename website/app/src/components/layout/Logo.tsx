import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/" className="flex items-center space-x-2 px-4 py-2">
      <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        Nuwa
      </span>
    </Link>
  )
} 