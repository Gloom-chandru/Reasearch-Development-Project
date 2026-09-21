import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = '/api'
const AuthContext = createContext(null)

// Enable cookie sending across all requests
axios.defaults.withCredentials = true

// Helper to extract CSRF token from document.cookie
export function getCsrfToken() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^|;\\s*)csrf_token=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : null
}

// Attach Authorization Bearer token & X-CSRF-Token on requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  const method = config.method ? config.method.toLowerCase() : ''
  if (['post', 'put', 'delete', 'patch'].includes(method)) {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }
  return config
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session via httpOnly cookie on initial mount
    axios.get(`${API_BASE}/auth/me`)
      .then(res => {
        setUser(res.data)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { username, password })
    const { user: userData, access_token } = res.data
    if (access_token) {
      localStorage.setItem('token', access_token)
    }
    setUser(userData)
    return userData
  }

  const logout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`)
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getCsrfToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}