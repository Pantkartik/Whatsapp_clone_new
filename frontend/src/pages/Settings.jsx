import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  UserIcon,
  KeyIcon,
  BellIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const { user, updateProfile, toggle2FA, verify2FAToggle, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileData, setProfileData] = useState({
    username: '',
    bio: '',
    avatar: ''
  })
  const [twoFACode, setTwoFACode] = useState('')
  const [show2FAVerification, setShow2FAVerification] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        bio: user.bio || '',
        avatar: user.avatar || ''
      })
    }
  }, [user])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await updateProfile(profileData)
      setMessage('Profile updated successfully!')
    } catch (error) {
      setMessage('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle2FA = async () => {
    setLoading(true)
    setMessage('')

    try {
      const result = await toggle2FA()
      
      if (result.verification_required) {
        setShow2FAVerification(true)
        setMessage('Verification code sent to your email')
      } else {
        setMessage(`2FA ${result.twofa_enabled ? 'enabled' : 'disabled'} successfully!`)
      }
    } catch (error) {
      setMessage('Failed to toggle 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify2FA = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await verify2FAToggle(twoFACode)
      setShow2FAVerification(false)
      setTwoFACode('')
      setMessage('2FA enabled successfully!')
    } catch (error) {
      setMessage('Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    const confirmation = prompt('Type "DELETE" to confirm account deletion:')
    if (confirmation !== 'DELETE') {
      return
    }

    try {
      // Add delete account API call here
      alert('Account deletion is not implemented yet')
    } catch (error) {
      setMessage('Failed to delete account')
    }
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'privacy', name: 'Privacy', icon: KeyIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
  ]

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
            <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-64">
            <nav className="bg-white rounded-lg shadow-sm p-2">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {message && (
                <div className={`mb-6 p-4 rounded-lg ${
                  message.includes('success') || message.includes('sent')
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {message}
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Settings</h2>
                  
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="flex items-center space-x-6">
                      <img
                        src={profileData.avatar || `https://ui-avatars.com/api/?name=${profileData.username}&background=3b82f6&color=fff`}
                        alt="Profile"
                        className="w-20 h-20 rounded-full"
                      />
                      <div>
                        <button
                          type="button"
                          className="btn-secondary text-sm"
                        >
                          Change Photo
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                          JPG, PNG up to 2MB
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        className="input-field resize-none"
                        rows={3}
                        maxLength={200}
                        placeholder="Tell people about yourself..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {profileData.bio.length}/200 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        className="input-field bg-gray-50"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email cannot be changed
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
                  
                  <div className="space-y-6">
                    {/* Two-Factor Authentication */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-500">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${user?.twofa_enabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {user?.twofa_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <button
                            onClick={handleToggle2FA}
                            disabled={loading}
                            className={`btn-${user?.twofa_enabled ? 'danger' : 'primary'} text-sm`}
                          >
                            {user?.twofa_enabled ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>

                      {show2FAVerification && (
                        <form onSubmit={handleVerify2FA} className="mt-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Verification Code
                            </label>
                            <input
                              type="text"
                              value={twoFACode}
                              onChange={(e) => setTwoFACode(e.target.value)}
                              className="input-field"
                              placeholder="Enter 6-digit code"
                              maxLength={6}
                              required
                            />
                          </div>
                          <div className="flex space-x-3">
                            <button
                              type="button"
                              onClick={() => {
                                setShow2FAVerification(false)
                                setTwoFACode('')
                              }}
                              className="btn-secondary text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="btn-primary text-sm"
                            >
                              Verify
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Change Password */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Password</h3>
                          <p className="text-sm text-gray-500">
                            Last changed 30 days ago
                          </p>
                        </div>
                        <button className="btn-secondary text-sm">
                          Change Password
                        </button>
                      </div>
                    </div>

                    {/* Active Sessions */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Active Sessions</h3>
                          <p className="text-sm text-gray-500">
                            Manage your active sessions
                          </p>
                        </div>
                        <button className="btn-secondary text-sm">
                          View Sessions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Privacy Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-4">Who can see my status</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="radio" name="status_privacy" className="mr-3" defaultChecked />
                          <span>Everyone</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="status_privacy" className="mr-3" />
                          <span>My contacts</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="status_privacy" className="mr-3" />
                          <span>Nobody</span>
                        </label>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-4">Last Seen</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="radio" name="last_seen" className="mr-3" defaultChecked />
                          <span>Everyone</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="last_seen" className="mr-3" />
                          <span>My contacts</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="last_seen" className="mr-3" />
                          <span>Nobody</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="space-y-4">
                        <label className="flex items-center justify-between">
                          <span>Message notifications</span>
                          <input type="checkbox" className="toggle" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between">
                          <span>Call notifications</span>
                          <input type="checkbox" className="toggle" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between">
                          <span>Status notifications</span>
                          <input type="checkbox" className="toggle" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              <div className="mt-12 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-red-900">Delete Account</h4>
                      <p className="text-sm text-red-700">
                        Permanently delete your account and all data
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
