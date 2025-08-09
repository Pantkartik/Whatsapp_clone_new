import { createContext, useContext, useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        const decoded = jwtDecode(token)
        if (decoded.exp * 1000 > Date.now()) {
          const response = await api.get('/accounts/me/')
          setUser(response.data)
        } else {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await api.post('/accounts/login/start/', { email, password })
    return response.data
  }

  const verify2FA = async (email, code) => {
    const response = await api.post('/accounts/login/verify/', { email, code })
    const { access, refresh, user: userData } = response.data
    
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    setUser(userData)
    
    return response.data
  }

  const register = async (username, email, password, password_confirm) => {
    const response = await api.post('/accounts/register/', { 
      username, 
      email, 
      password, 
      password_confirm 
    })
    return response.data
  }

  const logout = async () => {
    try {
      await api.post('/accounts/logout/')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    }
  }

  const updateProfile = async (data) => {
    const response = await api.patch('/accounts/me/', data)
    setUser(response.data)
    return response.data
  }

  const toggle2FA = async () => {
    const response = await api.post('/accounts/toggle-2fa/')
    return response.data
  }

  const verify2FAToggle = async (code) => {
    const response = await api.post('/accounts/verify-2fa-toggle/', { code })
    setUser(prev => ({ ...prev, twofa_enabled: response.data.twofa_enabled }))
    return response.data
  }

  const searchUsers = async (query) => {
    const response = await api.get(`/accounts/search/?q=${query}`)
    return response.data
  }

  const value = {
    user,
    loading,
    login,
    verify2FA,
    register,
    logout,
    updateProfile,
    toggle2FA,
    verify2FAToggle,
    searchUsers
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
