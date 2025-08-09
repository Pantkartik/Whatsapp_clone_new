import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import api from '../api/client'
import {
  ChatBubbleLeftIcon,
  QrCodeIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { user, logout, searchUsers } = useAuth()
  const navigate = useNavigate()
  
  const [rooms, setRooms] = useState([])
  const [showQR, setShowQR] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [inviteData, setInviteData] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingSearch, setLoadingSearch] = useState(false)

  useEffect(() => {
    loadRooms()
    loadInviteData()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMenu) setShowMenu(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMenu])

  const loadRooms = async () => {
    try {
      const response = await api.get('/chat/rooms/')
      setRooms(response.data.results || response.data)
    } catch (error) {
      console.error('Error loading rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInviteData = async () => {
    try {
      const response = await api.get('/invite/')
      const fullLink = `${window.location.origin}/invite/${response.data.token}`
      setInviteData({ ...response.data, full_link: fullLink })
    } catch (error) {
      console.error('Error loading invite data:', error)
    }
  }

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoadingSearch(true)
    try {
      const results = await searchUsers(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setLoadingSearch(false)
    }
  }

  const startChat = async (userId) => {
    try {
      const response = await api.post('/chat/rooms/get_or_create_direct/', {
        user_id: userId
      })
      navigate(`/chat/${response.data.id}`)
    } catch (error) {
      console.error('Error creating chat:', error)
    }
  }

  const copyInviteLink = () => {
    if (inviteData) {
      navigator.clipboard.writeText(inviteData.full_link)
      alert('Invite link copied to clipboard!')
    }
  }

  const regenerateInvite = async () => {
    try {
      await api.post('/invite/regenerate/')
      loadInviteData()
    } catch (error) {
      console.error('Error regenerating invite:', error)
    }
  }

  const formatLastSeen = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Whisper</h1>
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
                
                {showSearch && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-20">
                    <div className="p-4">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          handleSearch(e.target.value)
                        }}
                        className="input-field"
                        placeholder="Search users..."
                        autoFocus
                      />
                    </div>
                    
                    {loadingSearch && (
                      <div className="p-4 text-center">
                        <div className="spinner mx-auto"></div>
                      </div>
                    )}
                    
                    {searchResults.length > 0 && (
                      <div className="max-h-64 overflow-y-auto border-t">
                        {searchResults.map(user => (
                          <button
                            key={user.id}
                            onClick={() => {
                              startChat(user.id)
                              setShowSearch(false)
                              setSearchQuery('')
                            }}
                            className="w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors text-left"
                          >
                            <img
                              src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=3b82f6&color=fff`}
                              alt={user.username}
                              className="w-10 h-10 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {user.username}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                            <UserPlusIcon className="w-5 h-5 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {searchQuery && !loadingSearch && searchResults.length === 0 && (
                      <div className="p-4 text-center text-gray-500 border-t">
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(!showMenu)
                  }}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=3b82f6&color=fff`}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="hidden md:block font-medium text-gray-900">
                    {user?.username}
                  </span>
                  <EllipsisVerticalIcon className="w-4 h-4 text-gray-500" />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-20">
                    <div className="p-2">
                      <div className="px-3 py-2 border-b">
                        <p className="font-medium text-gray-900">{user?.username}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setShowQR(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg"
                      >
                        <QrCodeIcon className="w-5 h-5 text-gray-500" />
                        <span>QR Code</span>
                      </button>
                      
                      <Link
                        to="/settings"
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg"
                        onClick={() => setShowMenu(false)}
                      >
                        <Cog6ToothIcon className="w-5 h-5 text-gray-500" />
                        <span>Settings</span>
                      </Link>
                      
                      <hr className="my-2" />
                      
                      <button
                        onClick={() => {
                          logout()
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-red-50 rounded-lg text-red-600"
                      >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Recent Chats</h2>
          <p className="text-gray-600">Your conversations appear here</p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No chats yet</h3>
            <p className="text-gray-500 mb-6">Start a conversation by searching for users or sharing your QR code</p>
            <button
              onClick={() => setShowQR(true)}
              className="btn-primary"
            >
              Share QR Code
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {rooms.map(room => {
              const otherUser = room.participants?.find(p => p.id !== user.id)
              return (
                <Link
                  key={room.id}
                  to={`/chat/${room.id}`}
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={otherUser?.avatar || `https://ui-avatars.com/api/?name=${otherUser?.username}&background=3b82f6&color=fff`}
                        alt={otherUser?.username}
                        className="w-12 h-12 rounded-full"
                      />
                      {otherUser?.is_online && (
                        <div className="online-indicator"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {otherUser?.username || 'Unknown User'}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatLastSeen(room.updated_at)}
                        </span>
                      </div>
                      
                      {room.last_message ? (
                        <p className="text-sm text-gray-600 truncate">
                          🔒 Encrypted message
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          No messages yet
                        </p>
                      )}
                    </div>
                    
                    {room.unread_count > 0 && (
                      <div className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {room.unread_count}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Connect with QR Code
              </h3>
              
              {inviteData && (
                <div className="text-center space-y-6">
                  <div className="qr-container inline-block">
                    <QRCode value={inviteData.full_link} size={200} />
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Scan this code or share the link to connect
                    </p>
                    
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={inviteData.full_link}
                        readOnly
                        className="input-field text-xs flex-1"
                      />
                      <button
                        onClick={copyInviteLink}
                        className="btn-secondary text-xs px-3"
                      >
                        Copy
                      </button>
                    </div>
                    
                    <button
                      onClick={regenerateInvite}
                      className="text-blue-600 text-sm hover:text-blue-800"
                    >
                      Generate New Code
                    </button>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowQR(false)}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside overlay for search */}
      {showSearch && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}
