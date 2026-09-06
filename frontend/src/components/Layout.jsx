import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: null },
  { to: '/students', label: 'Students', icon: '👥', roles: null },
  { to: '/sessions', label: 'Sessions', icon: '📅', roles: null },
  { to: '/live', label: 'Live', icon: '📷', roles: null },
  { to: '/classrooms', label: 'Classrooms', icon: '🏫', roles: null },
  { to: '/notices', label: 'Notices', icon: '📢', roles: null },
  { to: '/users', label: 'Users', icon: '🔑', roles: ['super_admin', 'hod'] },
  { to: '/analytics', label: 'Analytics', icon: '📈', roles: null },
  { to: '/audit', label: 'Audit', icon: '🔍', roles: ['super_admin', 'hod', 'coordinator'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { connected } = useWebSocket()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎓</span>
                <h1 className="text-lg font-bold text-gray-900 hidden sm:block">Smart Classroom</h1>
              </div>
              {/* Desktop nav */}
              <nav className="hidden lg:flex gap-1">
                {visibleItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`
                    }
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {/* WebSocket indicator */}
              <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs ${
                connected ? 'text-green-600' : 'text-gray-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                }`}></span>
                {connected ? 'Live' : 'No display'}
              </span>

              {/* User info */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-gray-700">{user?.full_name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded capitalize">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>

              <button onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1">
                Logout
              </button>

              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100">
                {mobileOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-b shadow-sm">
          <div className="px-4 py-3 flex flex-col gap-1">
            {visibleItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t mt-1 text-xs text-gray-400">
              {user?.full_name} · {user?.role?.replace('_', ' ')}
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
