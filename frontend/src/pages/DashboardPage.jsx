import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import AttendanceOverview from '../components/AttendanceOverview'
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  BarChart3,
  Fingerprint,
  Clock,
  ArrowUpRight,
  Play,
  Video,
  UserPlus,
  Send,
  School,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ChevronRight,
  TrendingUp
} from 'lucide-react'

const API = '/api'

// Helper formatters
const formatSessionTime = (isoString) => {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return isoString
  }
}

const formatSessionDate = (isoString) => {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return isoString
  }
}

const formatActivityTime = (isoString) => {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return isoString
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTimeframe, setActiveTimeframe] = useState('Today')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setError('')
    try {
      const res = await axios.get(`${API}/dashboard/stats`)
      setStats(res.data)
    } catch (err) {
      setError('Failed to load dashboard stats.')
    } finally {
      setLoading(false)
    }
  }

  // Greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const displayName = user?.full_name || 'Dr. Senthil Kumar'

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Real data calculations
  const totalStudents = stats?.total_students || 0
  const enrolledStudents = stats?.enrolled_students || 0
  const unenrolledStudents = stats?.unenrolled_students ?? Math.max(0, totalStudents - enrolledStudents)
  const enrolledPercentage = totalStudents > 0 ? Math.round((enrolledStudents / totalStudents) * 100) : 0

  // Real attendance numbers
  const hasTodayRecords = (stats?.today_stats?.total || 0) > 0
  const presentCount = hasTodayRecords
    ? (stats.today_stats.present + stats.today_stats.late)
    : ((stats?.attendance_all_time?.present || 0) + (stats?.attendance_all_time?.late || 0))
  const absentCount = hasTodayRecords
    ? stats.today_stats.absent
    : (stats?.attendance_all_time?.absent || 0)
  const totalAttendanceRecords = presentCount + absentCount
  const attendanceRate = totalAttendanceRecords > 0 ? Math.round((presentCount / totalAttendanceRecords) * 100) : 0
  const absentRate = totalAttendanceRecords > 0 ? Math.round((absentCount / totalAttendanceRecords) * 100) : 0
  const attendanceSubtext = hasTodayRecords
    ? `${attendanceRate}% today`
    : (totalAttendanceRecords > 0 ? `${attendanceRate}% overall rate` : 'No records yet')
  const absentSubtext = hasTodayRecords
    ? `${absentRate}% today`
    : (totalAttendanceRecords > 0 ? `${absentRate}% overall rate` : 'No records yet')

  const totalSessionsCount = stats?.total_sessions || 0
  const activeSessionsCount = stats?.sessions_by_status?.active || 0

  // Dynamic attendance chart data from stats
  const chartData = (stats?.attendance_chart && stats.attendance_chart.length > 0)
    ? stats.attendance_chart
    : [
        { day: 'Mon', label: 'Mon', present: 0, absent: 0 },
        { day: 'Tue', label: 'Tue', present: 0, absent: 0 },
        { day: 'Wed', label: 'Wed', present: 0, absent: 0 },
        { day: 'Thu', label: 'Thu', present: 0, absent: 0 },
        { day: 'Fri', label: 'Fri', present: 0, absent: 0 },
        { day: 'Sat', label: 'Sat', present: 0, absent: 0 },
        { day: 'Sun', label: 'Sun', present: 0, absent: 0 }
      ]
  const maxChartVal = Math.max(1, ...chartData.map(d => Math.max(d.present, d.absent)))

  // Today's / active / scheduled sessions
  const todayDatePrefix = currentTime.toISOString().slice(0, 10)
  const todaysSessions = (stats?.recent_sessions || []).filter(s =>
    s.scheduled_start?.startsWith(todayDatePrefix) || s.status === 'active' || s.status === 'scheduled'
  )

  // Format Date and Time
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Hero Campus Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#091b36] via-[#0d2850] to-[#174179] text-white p-6 sm:p-8 shadow-xl border border-slate-700/50">
        {/* Background Campus Photo overlay */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <img
            src="/vit-campus-building.png"
            alt="Velammal Campus"
            className="w-full h-full object-cover object-right"
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">👋</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {getGreeting()}, {displayName}
              </h1>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm font-medium">
              Here's what's happening in your AI & DS department today.
            </p>
          </div>

          {/* Top Right Date & Time Floating Card + Motto */}
          <div className="flex flex-col items-start md:items-end gap-2">
            <p className="text-[11px] font-semibold text-blue-200 tracking-wider italic">
              "AI for a Better Tomorrow"
            </p>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/30 text-blue-300 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">
                  {formattedDate}
                </p>
                <p className="text-sm font-bold text-white font-mono tracking-tight">
                  {formattedTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Metric Summary Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Students</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalStudents}</p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <span>{enrolledStudents} enrolled for face recognition</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Present */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              {hasTodayRecords ? 'Present Today' : 'Present (Total)'}
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{presentCount}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">{attendanceSubtext}</p>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle cx="24" cy="24" r="18" stroke="#e2e8f0" strokeWidth="4" fill="transparent" />
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="#10b981"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="113"
                strokeDashoffset={113 - (113 * attendanceRate) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-emerald-600">{attendanceRate}%</span>
          </div>
        </div>

        {/* Card 3: Absent */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              {hasTodayRecords ? 'Absent Today' : 'Absent (Total)'}
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{absentCount}</p>
            <p className="text-[11px] font-semibold text-red-500 mt-1">{absentSubtext}</p>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle cx="24" cy="24" r="18" stroke="#e2e8f0" strokeWidth="4" fill="transparent" />
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="#ef4444"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="113"
                strokeDashoffset={113 - (113 * absentRate) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-red-500">{absentRate}%</span>
          </div>
        </div>

        {/* Card 4: Total Sessions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Sessions</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalSessionsCount}</p>
            <p className="text-[11px] font-semibold text-purple-600 mt-1">{activeSessionsCount} active now</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Attendance Overview — Dual Section UI (Section A & Section B) with Motion Effects */}
      <AttendanceOverview />

      {/* 4. Middle Section — Face Enrollment Progress & Today's Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Face Enrollment Progress */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Face Enrollment Progress</h3>
            </div>

            {/* Circular Progress Ring */}
            <div className="flex flex-col items-center justify-center py-3">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="50" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="64"
                    cy="64"
                    r="50"
                    stroke="#2563eb"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray="314"
                    strokeDashoffset={314 - (314 * enrolledPercentage) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-black text-slate-900">{enrolledPercentage}%</span>
                </div>
              </div>
              <p className="text-xs font-extrabold text-slate-800 mt-2">
                {enrolledStudents} / {totalStudents}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">students enrolled</p>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl text-xs text-amber-800 mt-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[11px] leading-tight">
                  {unenrolledStudents} students not yet enrolled — they will be marked unknown during recognition.
                </p>
                <Link
                  to="/students?tab=enrollment"
                  className="font-bold text-blue-600 hover:underline block mt-1 text-[11px]"
                >
                  Enroll now →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Today's Sessions */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Today's Sessions</h3>
              </div>
              <Link to="/sessions" className="text-xs font-bold text-blue-600 hover:underline">
                View all →
              </Link>
            </div>

            {/* List of Sessions */}
            <div className="space-y-2.5">
              {todaysSessions.length > 0 ? (
                todaysSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/80 transition-all text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-800 truncate" title={sess.title}>
                        {sess.title}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {formatSessionTime(sess.scheduled_start)} - {formatSessionTime(sess.scheduled_end)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px]">
                        {sess.present}P
                      </span>
                      {sess.late > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold rounded text-[10px]">
                          {sess.late}L
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold rounded text-[10px]">
                        {sess.absent}A
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          sess.status === 'active'
                            ? 'bg-emerald-500 text-white animate-pulse'
                            : sess.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sess.status === 'active' ? '▶ Live' : sess.status.charAt(0).toUpperCase() + sess.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 flex flex-col items-center justify-center text-center px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No sessions scheduled for today</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
                    Launch a live recognition session or schedule a new lecture.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Link
                      to="/live"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      Start Live
                    </Link>
                    <Link
                      to="/sessions"
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
                    >
                      Schedule
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section — 3 Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Recent Sessions Table */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Recent Sessions</h3>
              </div>
              <Link to="/sessions" className="text-xs font-bold text-blue-600 hover:underline">
                View all →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 text-[11px]">
                    <th className="pb-2 font-semibold">Session Name</th>
                    <th className="pb-2 font-semibold">Date & Time</th>
                    <th className="pb-2 font-semibold text-center">Present</th>
                    <th className="pb-2 font-semibold text-center">Absent</th>
                    <th className="pb-2 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(stats?.recent_sessions || []).slice(0, 5).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-800 max-w-[140px] truncate" title={row.title}>
                        {row.title}
                      </td>
                      <td className="py-2.5 text-slate-500 font-medium whitespace-nowrap">
                        {formatSessionDate(row.scheduled_start)}
                      </td>
                      <td className="py-2.5 text-center font-bold text-emerald-600">{row.present}</td>
                      <td className="py-2.5 text-center font-bold text-rose-500">{row.absent}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            row.status === 'active'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : row.status === 'scheduled'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recent_sessions || stats.recent_sessions.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        No recent sessions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Column 2: Recent Activity Timeline */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Recent Activity</h3>
              </div>
              <Link to="/audit" className="text-xs font-bold text-blue-600 hover:underline">
                View all →
              </Link>
            </div>

            <div className="space-y-3.5 text-xs">
              {(stats?.recent_activity || []).map((act) => {
                let dotColor = 'bg-blue-500'
                if (act.action === 'complete' || act.action === 'activate') dotColor = 'bg-emerald-500'
                else if (act.action === 'create') dotColor = 'bg-indigo-500'
                else if (act.action === 'enroll') dotColor = 'bg-teal-500'
                else if (act.action === 'correct_attendance') dotColor = 'bg-purple-500'

                return (
                  <div key={act.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <span className="font-semibold text-slate-700 truncate" title={act.details}>
                        {act.details}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {formatActivityTime(act.created_at)}
                    </span>
                  </div>
                )
              })}
              {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
                <p className="text-xs text-slate-400 py-4 text-center">No recent activity recorded</p>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Quick Actions */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Quick Actions</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/live"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 flex flex-col items-center text-center group transition-all"
              >
                <Video className="w-6 h-6 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Start Live Session</span>
              </Link>

              <Link
                to="/students?tab=enrollment"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 flex flex-col items-center text-center group transition-all"
              >
                <UserPlus className="w-6 h-6 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Enroll Students</span>
              </Link>

              <Link
                to="/notices"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 flex flex-col items-center text-center group transition-all"
              >
                <Send className="w-6 h-6 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Send Notice</span>
              </Link>

              <Link
                to="/analytics"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 flex flex-col items-center text-center group transition-all"
              >
                <BarChart3 className="w-6 h-6 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">View Analytics</span>
              </Link>

              <Link
                to="/classrooms"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 flex flex-col items-center text-center group transition-all"
              >
                <School className="w-6 h-6 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Classrooms</span>
              </Link>

              <Link
                to="/audit"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 flex flex-col items-center text-center group transition-all"
              >
                <ShieldCheck className="w-6 h-6 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Audit Logs</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

