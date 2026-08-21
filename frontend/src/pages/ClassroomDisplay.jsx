import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useWebSocket } from '../contexts/WebSocketContext'
import axios from 'axios'

const API = '/api'

export default function ClassroomDisplay() {
  const { classroomId } = useParams()
  const { connected, messages } = useWebSocket()
  const [session, setSession] = useState(null)
  const [notices, setNotices] = useState([])
  const [mode, setMode] = useState('attendance') // attendance -> info -> notice -> info
  const [recentRecords, setRecentRecords] = useState([])

  useEffect(() => {
    fetchSession()
    fetchNotices()
    const modeInterval = setInterval(() => {
      setMode(prev => {
        if (prev === 'attendance') return 'info'
        if (prev === 'info') return 'notice'
        if (prev === 'notice') return 'info'
        return 'attendance'
      })
    }, 15000)
    return () => clearInterval(modeInterval)
  }, [classroomId])

  useEffect(() => {
    // Process WebSocket messages for attendance events
    const latest = messages[messages.length - 1]
    if (latest?.type === 'attendance_confirmed') {
      setRecentRecords(prev => [latest, ...prev.slice(0, 9)])
    }
  }, [messages])

  const fetchSession = async () => {
    try {
      const res = await axios.get(`${API}/sessions?classroom_id=${classroomId}&status=active&limit=1`)
      if (res.data.sessions?.length > 0) {
        setSession(res.data.sessions[0])
      }
    } catch { /* ignore */ }
  }

  const fetchNotices = async () => {
    try {
      const res = await axios.get(`${API}/notices/active?classroom_id=${classroomId}`)
      setNotices(res.data.notices || [])
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Smart Classroom</h1>
            <p className="text-blue-300 mt-1">
              {session ? `Session: ${session.title}` : 'Waiting for active session...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 text-sm ${
              connected ? 'text-green-400' : 'text-red-400'
            }`}>
              <span className={`w-3 h-3 rounded-full ${
                connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></span>
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Dynamic Content */}
        {mode === 'attendance' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center text-blue-300">
              📸 Attendance Mode — Look at the Camera
            </h2>
            <div className="bg-gray-800 rounded-2xl p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recentRecords.slice(0, 8).map((r, i) => (
                  <div key={i} className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold">{r.student_name || 'Student'}</p>
                    <p className="text-sm text-green-400">
                      {r.status === 'present' ? '✓ Present' : '⚠ Late'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {r.similarity_score?.toFixed(2) || ''}
                    </p>
                  </div>
                ))}
                {recentRecords.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-400">
                    Awaiting attendance events...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === 'info' && (
          <div className="text-center py-16">
            <h2 className="text-4xl font-bold mb-4">
              {session ? `📚 ${session.title}` : '📚 Welcome to Smart Classroom'}
            </h2>
            <p className="text-xl text-gray-300">
              {session
                ? `${new Date(session.scheduled_start).toLocaleDateString()} | ${new Date(session.scheduled_start).toLocaleTimeString()}`
                : 'System ready for attendance'}
            </p>
            {session && (
              <div className="mt-8 inline-flex gap-8 bg-gray-800 rounded-2xl p-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-400">
                    {session.records?.length || 0}
                  </p>
                  <p className="text-sm text-gray-400">Marked</p>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'notice' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-center text-yellow-300">
              📢 Notices
            </h2>
            {notices.length > 0 ? (
              notices.map(notice => (
                <div key={notice.id} className="bg-gray-800 rounded-2xl p-6 border-l-4 border-yellow-500">
                  <h3 className="text-xl font-bold">{notice.title}</h3>
                  <p className="text-gray-300 mt-2">{notice.body}</p>
                  {notice.priority > 0 && (
                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                      Priority {notice.priority}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-400">
                No active notices
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}