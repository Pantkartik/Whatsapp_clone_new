import { Link } from 'react-router-dom'
import { 
  ChatBubbleLeftRightIcon, 
  VideoCameraIcon, 
  ShieldCheckIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
      {/* Navigation */}
      <nav className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-white text-2xl font-bold">Whisper</div>
          <Link
            to="/login"
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center text-white">
          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            Whisper
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto">
            Secure messaging with end-to-end encryption, video calls, and complete privacy
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              Learn More
            </a>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Chat</h3>
              <p className="opacity-90">Instant messaging with typing indicators and read receipts</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl">
              <VideoCameraIcon className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Video Calls</h3>
              <p className="opacity-90">High-quality peer-to-peer video calling</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl">
              <ShieldCheckIcon className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">End-to-End Encryption</h3>
              <p className="opacity-90">AES-256 encryption keeps your messages private</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl">
              <DevicePhoneMobileIcon className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">QR Code Invites</h3>
              <p className="opacity-90">Easy connection with QR code scanning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
    </div>
  )
}
