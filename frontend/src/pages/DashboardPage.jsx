import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API = '/api'

const STATUS_COLOR = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    setError('')
    try {
      const res = await axios.get(`${API}/dashboard/stats`)
      setStats(res.data)
    } catch (err) {
      setError('Failed to load dashboard stats. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <p className="font-medium">Dashboard unavailable</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={fetchStats} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
          Retry
        </button>
      </div>
    )
  }

  const att = stats?.attendance_all_time || {}
  const totalAtt = (att.present || 0) + (att.late || 0) + (att.absent || 0) + (att.manual || 0)

  const topCards = [
    {
      label: 'Sessions', value: stats?.total_sessions || 0,
      sub: `${stats?.sessions_by_status?.active || 0} active`,
      color: 'border-blue-400', icon: '📅',
      link: '/sessions',
    },
    {
      label: 'Students', value: stats?.total_students || 0,
      sub: `${stats?.enrolled_students || 0} face-enrolled`,
      color: 'border-teal-400', icon: '👥',
      link: '/students',
    },
    {
      label: 'Present (all time)', value: att.present || 0,
      sub: totalAtt ? `${Math.round((att.present / totalAtt) * 100)}% of records` : 'no records',
      color: 'border-green-400', icon: '✅',
      link: '/sessions',
    },
    {
      label: 'Absent (all time)', value: att.absent || 0,
      sub: `${att.late || 0} late`,
      color: 'border-red-400', icon: '❌',
      link: '/sessions',
    },
    {
      label: 'Active Notices', value: stats?.active_notices || 0,
      sub: 'showing on displays',
      color: 'border-yellow-400', icon: '📢',
      link: '/notices',
    },
    {
      label: 'Experiments', value: stats?.total_experiments || 0,
      sub: 'results recorded',
      color: 'border-purple-400', icon: '🔬',
      link: '/analytics',
    },
  ]

  // Enrollment progress bar
  const enrolled = stats?.enrolled_students || 0
  const total = stats?.total_students || 0
  const enrollPct = total > 0 ? Math.round((enrolled / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <button onClick={fetchStats} className="text-xs text-gray-400 hover:text-gray-600">
          ↻ Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {topCards.map(card => (
          <Link key={card.label} to={card.link}
            className={`bg-white p-4 rounded-xl border-l-4 ${card.color} hover:shadow-sm transition-shadow`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
              <span className="text-2xl opacity-60">{card.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Enrollment progress */}
      {total > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">Face Enrollment Progress</p>
            <p className="text-sm text-gray-500">{enrolled} / {total} students ({enrollPct}%)</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${enrollPct === 100 ? 'bg-green-500' : enrollPct > 50 ? 'bg-blue-500' : 'bg-yellow-500'}`}
              style={{ width: `${enrollPct}%` }}
            />
          </div>
          {stats?.unenrolled_students > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠ {stats.unenrolled_students} student{stats.unenrolled_students > 1 ? 's' : ''} not yet enrolled —
              they will be marked unknown during recognition.{' '}
              <Link to="/students" className="underline">Enroll now →</Link>
            </p>
          )}
        </div>
      )}

      {/* Recent sessions */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Sessions</h3>
          <Link to="/sessions" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>
        {stats?.recent_sessions?.length > 0 ? (
          <div className="space-y-2">
            {stats.recent_sessions.map(session => (
              <div key={session.id}
                className="flex items-center justify-between py-2.5 px-1 border-b last:border-0 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{session.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(session.scheduled_start).toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                    {' · '}
                    {new Date(session.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {/* Quick attendance pills */}
                  {session.total_records > 0 && (
                    <div className="hidden sm:flex gap-1 text-xs">
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{session.present}P</span>
                      {session.late > 0 && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">{session.late}L</span>}
                      {session.absent > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">{session.absent}A</span>}
                    </div>
                  )}
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLOR[session.status] || 'bg-gray-100 text-gray-600'}`}>
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-sm">No sessions yet.</p>
            <Link to="/sessions" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
              Create your first session →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
