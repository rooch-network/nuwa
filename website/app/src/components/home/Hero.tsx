import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <div className="relative min-h-[600px]">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 to-[#FF15FB] dark:from-gray-900 dark:via-gray-900 dark:to-[#FF15FB] bg-[length:100%_200%] bg-[position:0%_30%]"></div>
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url('/hero-background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'grayscale(100%)',
        }}
      ></div>
      <div className="relative container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center pt-[30px]">
          {/* Logo */}
          <div className="flex justify-center mb-8 sm:mb-12">
            <img
              src="/nuwa-logo-horizontal-dark.svg"
              className="h-16 sm:h-20 w-auto hidden dark:block"
              alt="Nuwa"
            />
            <img
              src="/nuwa-logo-horizontal.svg"
              className="h-16 sm:h-20 w-auto dark:hidden"
              alt="Nuwa"
            />
          </div>

          {/* Tagline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-6">
            Own. Interact. Learn. Evolve on-chain
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            Nuwa is an On-Chain AI with its own assets, on-chain operations, and continuous learning.
          </p>

          {/* Explore Agents Button */}
          <Link
            to="/allagents"
            className="group relative px-8 py-3 text-lg font-semibold rounded-full border-2 border-purple-600 hover:border-transparent transition-all duration-500 ease-in-out overflow-hidden bg-white dark:bg-gray-900 inline-block"
          >
            <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 group-hover:text-white transition-colors duration-500">Explore Agents</span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-in-out origin-left"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-in-out origin-right delay-100"></div>
          </Link>
        </div>
      </div>
    </div>
  )
} 