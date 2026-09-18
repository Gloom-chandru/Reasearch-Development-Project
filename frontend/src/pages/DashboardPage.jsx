import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
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
  Sliders,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ChevronRight,
  TrendingUp
} from 'lucide-react'

const API = '/api'

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

  // Fallback data calculations
  const totalStudents = stats?.total_students || 246
  const enrolledStudents = stats?.enrolled_students || 6
  const unenrolledStudents = totalStudents - enrolledStudents
  const enrolledPercentage = Math.round((enrolledStudents / totalStudents) * 100)

  const presentToday = 98
  const absentToday = 148
  const totalSessionsCount = stats?.total_sessions || 12

  // Dummy attendance bar chart data for Mon-Sun
  const attendanceChartData = [
    { day: 'Mon', present: 100, absent: 150 },
    { day: 'Tue', present: 130, absent: 98 },
    { day: 'Wed', present: 120, absent: 100 },
    { day: 'Thu', present: 110, absent: 185 },
    { day: 'Fri', present: 122, absent: 90 },
    { day: 'Sat', present: 80, absent: 105 },
    { day: 'Sun', present: 98, absent: 152 }
  ]

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
              <span>↑ +6 this month</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-500">Present Today</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{presentToday}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">40% attendance</p>
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
                strokeDashoffset="67"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-emerald-600">40%</span>
          </div>
        </div>

        {/* Card 3: Absent Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-500">Absent Today</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{absentToday}</p>
            <p className="text-[11px] font-semibold text-red-500 mt-1">60% absent</p>
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
                strokeDashoffset="45"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-red-500">60%</span>
          </div>
        </div>

        {/* Card 4: Total Sessions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Sessions</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalSessionsCount}</p>
            <p className="text-[11px] font-semibold text-purple-600 mt-1">0 active now</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Middle Section — 3 Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Attendance Overview Bar Chart */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Attendance Overview</h3>
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-[11px] font-semibold">
              {['Today', 'This Week', 'This Month'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeTimeframe === tf
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-48 flex items-end justify-between gap-2 pt-4 px-2">
            {attendanceChartData.map((item) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-36">
                  {/* Green Present Bar */}
                  <div
                    className="w-2.5 bg-emerald-400 rounded-t-md transition-all hover:bg-emerald-500"
                    style={{ height: `${(item.present / 200) * 100}%` }}
                    title={`Present: ${item.present}`}
                  />
                  {/* Red Absent Bar */}
                  <div
                    className="w-2.5 bg-rose-400 rounded-t-md transition-all hover:bg-rose-500"
                    style={{ height: `${(item.absent / 200) * 100}%` }}
                    title={`Absent: ${item.absent}`}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500">{item.day}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-400" />
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-rose-400" />
              <span className="text-slate-600">Absent</span>
            </div>
          </div>
        </div>

        {/* Column 2: Face Enrollment Progress */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
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

        {/* Column 3: Today's Sessions */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
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
              {[
                {
                  title: 'Live Attendance Session',
                  time: '04:28 PM - 04:58 PM',
                  badgeP: '1P',
                  badgeA: '31A',
                  status: 'Live',
                  color: 'bg-emerald-500 text-white'
                },
                {
                  title: 'Live Attendance Session',
                  time: '04:27 PM - 04:57 PM',
                  badgeP: '1P',
                  badgeA: '31A',
                  status: 'Ongoing',
                  color: 'bg-blue-100 text-blue-700'
                },
                {
                  title: 'Live Attendance Session',
                  time: '04:24 PM - 04:54 PM',
                  badgeP: '1P',
                  badgeA: '31A',
                  status: 'Upcoming',
                  color: 'bg-purple-100 text-purple-700'
                },
                {
                  title: 'Python Programming - Lab 1',
                  time: '09:00 AM - 10:00 AM',
                  badgeP: '1P',
                  badgeL: '1L',
                  badgeA: '30A',
                  status: 'Completed',
                  color: 'bg-slate-100 text-emerald-700'
                },
                {
                  title: 'DSA - Lecture 5',
                  time: '09:00 AM - 10:00 AM',
                  badgeP: '1P',
                  badgeL: '1L',
                  badgeA: '30A',
                  status: 'Completed',
                  color: 'bg-slate-100 text-emerald-700'
                }
              ].map((sess, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/80 transition-all text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-800 truncate">{sess.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{sess.time}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px]">
                      {sess.badgeP}
                    </span>
                    {sess.badgeL && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold rounded text-[10px]">
                        {sess.badgeL}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold rounded text-[10px]">
                      {sess.badgeA}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${sess.color}`}>
                      {sess.status === 'Live' ? '▶ Live' : sess.status}
                    </span>
                  </div>
                </div>
              ))}
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
                  {[
                    { name: 'Live Attendance Session', date: 'Sep 9, 04:28 PM', p: 1, a: 31 },
                    { name: 'Live Attendance Session', date: 'Sep 9, 04:27 PM', p: 1, a: 31 },
                    { name: 'Live Attendance Session', date: 'Sep 9, 04:24 PM', p: 1, a: 31 },
                    { name: 'Live Attendance Session', date: 'Sep 9, 04:23 PM', p: 0, a: 31 },
                    { name: 'Python Programming - Lab 1', date: 'Sep 9, 09:00 AM', p: 1, a: 30 }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 font-bold text-slate-800 max-w-[140px] truncate">
                        {row.name}
                      </td>
                      <td className="py-2.5 text-slate-500 font-medium">{row.date}</td>
                      <td className="py-2.5 text-center font-bold text-emerald-600">{row.p}</td>
                      <td className="py-2.5 text-center font-bold text-rose-500">{row.a}</td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
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
              {[
                { text: 'Live Attendance Session completed', time: '4:28 PM', color: 'bg-emerald-500' },
                { text: 'Live Attendance Session completed', time: '4:27 PM', color: 'bg-emerald-500' },
                { text: 'Live Attendance Session completed', time: '4:24 PM', color: 'bg-emerald-500' },
                { text: 'New notice added', time: '12:15 PM', color: 'bg-rose-500' },
                { text: '3 students enrolled for face recognition', time: '11:40 AM', color: 'bg-blue-500' },
                { text: 'System backup completed', time: '09:30 AM', color: 'bg-emerald-500' }
              ].map((act, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${act.color}`} />
                    <span className="font-semibold text-slate-700 truncate">{act.text}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">{act.time}</span>
                </div>
              ))}
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
                to="/users"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 flex flex-col items-center text-center group transition-all"
              >
                <Users className="w-6 h-6 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Manage Users</span>
              </Link>

              <Link
                to="/audit?tab=settings"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 flex flex-col items-center text-center group transition-all"
              >
                <Sliders className="w-6 h-6 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">System Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

