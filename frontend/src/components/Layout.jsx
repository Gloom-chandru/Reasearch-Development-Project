import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { useNotification } from '../contexts/NotificationContext'
import ErrorBoundary from './ErrorBoundary'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Video,
  School,
  UserCheck,
  Bell,
  KeyRound,
  BarChart3,
  FileText,
  Settings,
  Search,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Cpu,
  ExternalLink,
  Award,
  CalendarDays
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/students', label: 'Students', icon: Users, roles: null },
  { to: '/sessions', label: 'Sessions', icon: Calendar, roles: null },
  { to: '/timetable', label: 'Timetable', icon: CalendarDays, roles: null },
  { to: '/live', label: 'Live Classroom', icon: Video, roles: null },
  { to: '/classrooms', label: 'Classrooms', icon: School, roles: null },
  { to: '/students?tab=enrollment', label: 'Face Enrollment', icon: UserCheck, roles: null },
  { to: '/notices', label: 'Notices', icon: Bell, badge: true, roles: null },
  { to: '/users', label: 'Users', icon: KeyRound, roles: ['super_admin', 'hod'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: null },
  {
    to: '/marks-analyzer',
    label: 'Marks Analyzer',
    icon: Award,
    roles: null,
    externalUrl: 'https://student-marks-ai-analyzer.onrender.com/'
  },
  { to: '/audit', label: 'Audit Logs', icon: FileText, roles: ['super_admin', 'hod', 'coordinator'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { connected } = useWebSocket()
  const { notify } = useNotification()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileDropdown, setProfileDropdown] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  const handleBellClick = () => {
    navigate('/notices')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  )

  const displayName = user?.full_name || 'Dr. Senthil Kumar'
  const displayRole = user?.role ? user.role.replace('_', ' ').toUpperCase() : 'HOD - AI & DS'

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-slate-800 flex font-sans">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-[#091b36] text-white z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Top Sidebar Brand */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white leading-snug">
                  Smart Classroom
                </h1>
                <p className="text-[10px] text-blue-300/80 font-medium">AI-Powered Learning</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 mt-2">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive =
                location.pathname === item.to ||
                (item.to.includes('?') && location.pathname + location.search === item.to)

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive: linkActive }) => {
                    const active = linkActive || isActive
                    return `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                    {item.externalUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
                        }}
                        title="Open Marks Analyzer in new window"
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Bottom AI Accent Badge */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/90 rounded-2xl p-3.5 border border-slate-700/50 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-1.5">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-[11px] font-bold text-white tracking-wide">AI & DS</span>
            </div>
            <p className="text-[10px] text-slate-300 leading-snug font-medium">
              Empowering Intelligent Learning at VIT
            </p>
            <p className="text-[9px] text-slate-400 mt-2 font-medium">
              Velammal Institute of Technology
              <br />
              Chennai, Tamil Nadu
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">
              {/* Left Side — Mobile Menu Button & Institution Brand */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Logo & Department Name */}
                <div className="flex items-center gap-3">
                  <img
                    src="/vit-full-logo.png"
                    alt="Velammal Institute of Technology"
                    className="h-8 sm:h-9 object-contain"
                  />
                  <div className="hidden sm:block h-7 w-px bg-slate-200" />
                  <div className="hidden md:block">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      Velammal Institute of Technology
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Department of Artificial Intelligence & Data Science
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Side — Search, Notifications, User */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Search Bar */}
                <div className="hidden md:flex items-center relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search students, sessions, classrooms..."
                    className="pl-9 pr-12 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-xl w-64 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800 placeholder-slate-400"
                  />
                  <kbd className="absolute right-2.5 text-[10px] font-semibold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    Ctrl K
                  </kbd>
                </div>

                {/* Notification Bell */}
                <button
                  onClick={handleBellClick}
                  title="Click to view live updates & notifications (pops bottom-right)"
                  className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    3
                  </span>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors hidden sm:block"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* WebSocket Live Indicator */}
                <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span className={connected ? 'text-emerald-700' : 'text-slate-500'}>
                    {connected ? 'Live Kiosk' : 'Disconnected'}
                  </span>
                </div>

                {/* User Profile */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdown(!profileDropdown)}
                    className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      SK
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-xs font-bold text-slate-800 leading-snug">{displayName}</p>
                      <p className="text-[10px] text-slate-500 font-medium leading-none">
                        {displayRole}
                      </p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-800">{displayName}</p>
                        <p className="text-[10px] text-slate-500">{user?.username || 'admin'}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content — Full Width */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Global Footer — Full Width */}
        <footer className="border-t border-slate-200/80 bg-white py-3 px-6 text-xs text-slate-500">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              © 2026 Velammal Institute of Technology | Department of Artificial Intelligence & Data
              Science
            </p>
            <div className="flex items-center gap-2 font-semibold text-slate-600">
              <span>Learn</span>
              <span>•</span>
              <span>Innovate</span>
              <span>•</span>
              <span>Build</span>
              <span>•</span>
              <span>Lead</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

