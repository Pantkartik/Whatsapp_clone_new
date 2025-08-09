import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import api from '../api/client'
import {
  PlusIcon,
  ArrowLeftIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

export default function Status() {
  const { user } = useAuth()
  const [myStatuses, setMyStatuses] = useState([])
  const [otherStatuses, setOtherStatuses] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newStatusText, setNewStatusText] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadStatuses()
  }, [])

  const loadStatuses = async () => {
    try {
      // Load my statuses
      const myResponse = await api.get('/status/my_statuses/')
      setMyStatuses(myResponse.data)

      // Load other statuses
      const otherResponse = await api.get('/status/')
      setOtherStatuses(otherResponse.data.results || otherResponse.data)
    } catch (error) {
      console.error('Error loading statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  const createStatus = async (e) => {
    e.preventDefault()
    if (!newStatusText.trim()) return

    setCreating(true)
    try {
      await api.post('/status/', {
        text: newStatusText.trim()
      })
      
      setNewStatusText('')
      setShowCreateModal(false)
      loadStatuses() // Reload statuses
    } catch (error) {
      console.error('Error creating status:', error)
    } finally {
      setCreating(false)
    }
  }

  const deleteStatus = async (statusId) => {
    if (!confirm('Are you sure you want to delete this status?')) return

    try {
      await api.delete(`/status/${statusId}/`)
      loadStatuses()
    } catch (error) {
      console.error('Error deleting status:', error)
    }
  }

  const viewStatus = async (statusId) => {
    try {
      await api.post(`/status/${statusId}/view/`)
    } catch (error) {
      console.error('Error marking status as viewed:', error)
    }
  }

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const getTimeRemaining = (timestamp) => {
    const expiresAt = new Date(timestamp)
    const now = new Date()
    const diffMs = expiresAt - now
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffHours <= 0) return 'Expired'
    if (diffHours < 24) return `${diffHours}h left`
    return '24h left'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Status</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* My Status Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Status</h2>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            {myStatuses.length === 0 ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=3b82f6&color=fff`}
                    alt="Your avatar"
                    className="w-full h-full rounded-full"
                  />
                </div>
                <p className="text-gray-500 mb-4">No status updates yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Status
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full status-ring">
                      <img
                        src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=3b82f6&color=fff`}
                        alt="Your avatar"
                        className="w-full h-full rounded-full"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Your Status</p>
                      <p className="text-sm text-gray-500">
                        {myStatuses.length} update{myStatuses.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-secondary"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add
                  </button>
                </div>

                <div className="grid gap-3">
                  {myStatuses.map(status => (
                    <div key={status.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-900">{status.text}</p>
                        <button
                          onClick={() => deleteStatus(status.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{formatTimeAgo(status.created_at)}</span>
                        <div className="flex items-center space-x-3">
                          <span>{getTimeRemaining(status.expires_at)}</span>
                          <div className="flex items-center space-x-1">
                            <EyeIcon className="w-3 h-3" />
                            <span>{status.viewer_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Other Statuses */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Updates</h2>
          
          {otherStatuses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-gray-500">No status updates from your contacts</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {otherStatuses.map(status => (
                <div
                  key={status.id}
                  className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => viewStatus(status.id)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full status-ring">
                      <img
                        src={status.owner.avatar || `https://ui-avatars.com/api/?name=${status.owner.username}&background=3b82f6&color=fff`}
                        alt={status.owner.username}
                        className="w-full h-full rounded-full"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">
                          {status.owner.username}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(status.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-2">{status.text}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{getTimeRemaining(status.expires_at)}</span>
                        <div className="flex items-center space-x-1">
                          <EyeIcon className="w-3 h-3" />
                          <span>{status.viewer_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Status Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create Status Update
              </h3>
              
              <form onSubmit={createStatus} className="space-y-4">
                <div>
                  <textarea
                    value={newStatusText}
                    onChange={(e) => setNewStatusText(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                    maxLength={300}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newStatusText.length}/300 characters
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newStatusText.trim() || creating}
                    className="btn-primary"
                  >
                    {creating ? (
                      <div className="flex items-center">
                        <div className="spinner w-4 h-4 mr-2"></div>
                        Posting...
                      </div>
                    ) : (
                      'Post Status'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
