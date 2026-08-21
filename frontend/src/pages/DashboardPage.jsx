import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch recent sessions and their attendance stats
      const res = await axios.get(`${API}/sessions?limit=5`)
      const sessions = res.data.sessions || []

      let totalPresent = 0
      let totalLate = 0
      let totalAbsent = 0
      let totalSessions = sessions.length

      for (const session of sessions) {
        try {
          const attRes = await axios.get(`${API}/sessions/${session.id}/attendance`)
          totalPresent += attRes.data.present || 0
          totalLate += attRes.data.late || 0
          totalAbsent += attRes.data.absent || 0
        } catch { /* ignore */ }
      }

      setStats({
        totalSessions,
        totalPresent,
        totalLate,
        totalAbsent,
        totalStudents: totalPresent + totalLate + totalAbsent,
        recentSessions: sessions.slice(0, 5),
      })
    } catch (err) {
      console.error('Failed to fetch stats:', err)
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

  const cards = [
    { label: 'Total Sessions', value: stats?.totalSessions || 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Present', value: stats?.totalPresent || 0, color: 'bg-green-50 text-green-700' },
    { label: 'Late', value: stats?.totalLate || 0, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Absent', value: stats?.totalAbsent || 0, color: 'bg-red-50 text-red-700' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className={`p-4 rounded-xl border ${card.color}`}>
            <p className="text-sm opacity-75">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Sessions</h3>
        {stats?.recentSessions?.length > 0 ? (
          <div className="space-y-3">
            {stats.recentSessions.map(session => (
              <div key={session.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{session.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(session.scheduled_start).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  session.status === 'active' ? 'bg-green-100 text-green-700' :
                  session.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No sessions yet. Create one to get started.</p>
        )}
      </div>
    </div>
  )
}