import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useSocket from '../hooks/useSocket'
import api from '../api/client'
import { encrypt, decrypt, generateSessionKey, getSessionKey } from '../api/crypto'
import {
  PaperAirplaneIcon,
  VideoCameraIcon,
  ArrowLeftIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'

export default function Chat() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [room, setRoom] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [encryptionKey, setEncryptionKey] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // WebSocket URL with authentication
  const wsUrl = useMemo(() => {
    const token = localStorage.getItem('access_token')
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/chat/${roomId}/?token=${token}`
  }, [roomId])

  // Initialize encryption key
  useEffect(() => {
    const initEncryption = async () => {
      try {
        let key = getSessionKey(roomId)
        if (!key) {
          key = await generateSessionKey(roomId)
        }
        setEncryptionKey(key)
      } catch (error) {
        console.error('Encryption initialization failed:', error)
      }
    }
    
    initEncryption()
  }, [roomId])

  // Load room data and messages
  useEffect(() => {
    loadRoomData()
    loadMessages()
  }, [roomId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // WebSocket message handler
  const handleWebSocketMessage = async (data) => {
    switch (data.type) {
      case 'message':
        try {
          if (encryptionKey) {
            const decryptedContent = await decrypt(
              encryptionKey,
              data.message.ciphertext,
              data.message.nonce
            )
            const messageWithDecryption = {
              ...data.message,
              decrypted_content: decryptedContent
            }
            setMessages(prev => [messageWithDecryption, ...prev])
          }
        } catch (error) {
          console.error('Decryption failed:', error)
        }
        break
        
      case 'typing':
        if (data.user_id !== user.id) {
          setTypingUsers(prev => new Set([...prev, data.username]))
        }
        break
        
      case 'stop_typing':
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.username)
          return newSet
        })
        break
        
      case 'user_joined':
        console.log(`${data.username} joined the chat`)
        break
        
      case 'user_left':
        console.log(`${data.username} left the chat`)
        break
    }
  }

  const { send: sendWebSocketMessage, connected } = useSocket(
    wsUrl,
    handleWebSocketMessage
  )

  const loadRoomData = async () => {
    try {
      const response = await api.get(`/chat/rooms/${roomId}/`)
      setRoom(response.data)
      
      const other = response.data.participants?.find(p => p.id !== user.id)
      setOtherUser(other)
    } catch (error) {
      console.error('Error loading room:', error)
      if (error.response?.status === 404) {
        navigate('/dashboard')
      }
    }
  }

  const loadMessages = async (pageNum = 1) => {
    try {
      const response = await api.get(`/chat/messages/?room=${roomId}&page=${pageNum}`)
      const newMessages = response.data.results || response.data
      
      if (encryptionKey) {
        const decryptedMessages = await Promise.all(
          newMessages.map(async (message) => {
            try {
              if (message.ciphertext) {
                const decryptedContent = await decrypt(
                  encryptionKey,
                  message.ciphertext,
                  message.nonce
                )
                return { ...message, decrypted_content: decryptedContent }
              }
              return message
            } catch (error) {
              console.error('Message decryption failed:', error)
              return { ...message, decrypted_content: '[Decryption failed]' }
            }
          })
        )
        
        if (pageNum === 1) {
          setMessages(decryptedMessages.reverse())
        } else {
          setMessages(prev => [...decryptedMessages.reverse(), ...prev])
        }
      }
      
      setHasMore(response.data.next != null)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !encryptionKey || sending) return

    setSending(true)
    
    try {
      // Encrypt message
      const { ciphertext, nonce, tag } = await encrypt(encryptionKey, newMessage.trim())
      
      // Send via WebSocket
      const success = sendWebSocketMessage({
        type: 'message',
        message_type: 'text',
        ciphertext,
        nonce,
        tag
      })
      
      if (success) {
        setNewMessage('')
        handleStopTyping()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleTyping = () => {
    sendWebSocketMessage({ type: 'typing' })
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping()
    }, 2000)
  }

  const handleStopTyping = () => {
    sendWebSocketMessage({ type: 'stop_typing' })
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const startVideoCall = () => {
    navigate(`/call/${roomId}`)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMoreMessages = () => {
    if (hasMore && !loading) {
      loadMessages(page + 1)
      setPage(prev => prev + 1)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = []
    let currentDate = null
    
    messages.forEach((message, index) => {
      const messageDate = new Date(message.created_at).toDateString()
      
      if (messageDate !== currentDate) {
        groups.push({
          type: 'date',
          date: messageDate,
          formatted: formatDate(message.created_at)
        })
        currentDate = messageDate
      }
      
      groups.push({ type: 'message', ...message, index })
    })
    
    return groups
  }, [messages])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors md:hidden"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={otherUser?.avatar || `https://ui-avatars.com/api/?name=${otherUser?.username}&background=3b82f6&color=fff`}
                alt={otherUser?.username}
                className="w-10 h-10 rounded-full"
              />
              {otherUser?.is_online && (
                <div className="online-indicator"></div>
              )}
            </div>
            
            <div>
              <h1 className="font-semibold text-gray-900">
                {otherUser?.username || 'Loading...'}
              </h1>
              <p className="text-xs text-gray-500">
                {typingUsers.size > 0 
                  ? `${Array.from(typingUsers).join(', ')} typing...`
                  : otherUser?.is_online 
                    ? 'Online' 
                    : `Last seen ${formatTime(otherUser?.last_seen)}`
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={startVideoCall}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <VideoCameraIcon className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {/* Load More Button */}
        {hasMore && messages.length > 0 && (
          <div className="text-center">
            <button
              onClick={loadMoreMessages}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Load older messages
            </button>
          </div>
        )}
        
        {/* Connection Status */}
        {!connected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <p className="text-yellow-800 text-sm">Reconnecting...</p>
          </div>
        )}
        
        {/* Encryption Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-green-800 text-sm">
            🔒 Messages are end-to-end encrypted
          </p>
        </div>

        {/* Message Groups */}
        {groupedMessages.map((item, index) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${index}`} className="text-center">
                <span className="inline-block bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {item.formatted}
                </span>
              </div>
            )
          }
          
          const isOwn = item.sender.id === user.id
          
          return (
            <div key={item.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`chat-bubble ${isOwn ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                <p className="text-sm">{item.decrypted_content || '[Encrypted]'}</p>
                <p className={`message-status ${isOwn ? 'text-right' : 'text-left'}`}>
                  {formatTime(item.created_at)}
                  {isOwn && (
                    <span className="ml-1">
                      {item.read_by?.length > 1 ? '✓✓' : '✓'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )
        })}
        
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="flex justify-start">
            <div className="chat-bubble chat-bubble-received">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t p-4">
        <form onSubmit={sendMessage} className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              if (e.target.value.trim()) {
                handleTyping()
              } else {
                handleStopTyping()
              }
            }}
            placeholder="Type a message..."
            className="flex-1 input-field"
            disabled={sending || !connected}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !connected}
            className="btn-primary px-4 py-2 flex items-center space-x-2"
          >
            {sending ? (
              <div className="spinner w-4 h-4"></div>
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
