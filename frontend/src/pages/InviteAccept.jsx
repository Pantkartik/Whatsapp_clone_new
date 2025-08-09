import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function InviteAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [status, setStatus] = useState('checking') // checking, valid, invalid, accepting, accepted, error
  const [inviteInfo, setInviteInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    checkInvite()
  }, [token])

  const checkInvite = async () => {
    try {
      const response = await api.get(`/invite/info/?token=${token}`)
      
      if (response.data.valid) {
        setInviteInfo(response.data)
        setStatus('valid')
      } else {
        setStatus('invalid')
        setError('This invite link is invalid or has expired')
      }
    } catch (error) {
      setStatus('invalid')
      setError('This invite link is invalid or has expired')
    }
  }

  const acceptInvite = async () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/invite/${token}`)
      return
    }

    setStatus('accepting')
    
    try {
      const response = await api.post('/invite/accept/', { token })
      setStatus('accepted')
      
      // Redirect to chat after 2 seconds
      setTimeout(() => {
        navigate(`/chat/${response.data.room_id}`)
      }, 2000)
    } catch (error) {
      setStatus('error')
      setError(error.response?.data?.error || 'Failed to accept invite')
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Checking invite...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify this invitation
            </p>
          </div>
        )

      case 'valid':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <img
                src={inviteInfo.owner.avatar || `https://ui-avatars.com/api/?name=${inviteInfo.owner.username}&background=3b82f6&color=fff`}
                alt={inviteInfo.owner.username}
                className="w-full h-full rounded-full"
              />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Join {inviteInfo.owner.username} on Whisper
            </h2>
            
            <p className="text-gray-600 mb-8">
              {inviteInfo.owner.username} has invited you to start a secure conversation
            </p>

            {user ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    You'll be connected as <strong>{user.username}</strong>
                  </p>
                </div>
                
                <button
                  onClick={acceptInvite}
                  className="btn-primary w-full text-lg py-3"
                >
                  Accept Invitation
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  You need to sign in to accept this invitation
                </p>
                
                <button
                  onClick={() => navigate(`/login?redirect=/invite/${token}`)}
                  className="btn-primary w-full text-lg py-3"
                >
                  Sign In to Accept
                </button>
              </div>
            )}
          </div>
        )

      case 'accepting':
        return (
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Accepting invitation...
            </h2>
            <p className="text-gray-600">
              Setting up your secure connection
            </p>
          </div>
        )

      case 'accepted':
        return (
          <div className="text-center">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invitation Accepted!
            </h2>
            <p className="text-gray-600 mb-4">
              You're now connected with {inviteInfo?.owner.username}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to chat...
            </p>
          </div>
        )

      case 'invalid':
      case 'error':
        return (
          <div className="text-center">
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {status === 'invalid' ? 'Invalid Invitation' : 'Error'}
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
            >
              Go to Dashboard
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Whisper</h1>
          <p className="text-gray-600 mt-2">Secure Chat Invitation</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          {renderContent()}
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Protected by end-to-end encryption</p>
        </div>
      </div>
    </div>
  )
}
