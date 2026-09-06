import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useWebSocket } from '../contexts/WebSocketContext'
import axios from 'axios'

const API = '/api'
const MODE_CYCLE = ['attendance', 'info', 'notice', 'info']
const MODE_DURATION_MS = 15000

export default function ClassroomDisplay() {
  const { classroomId } = useParams()
  const { createClassroomSocket, connected: anyConnected } = useWebSocket()
  const [session, setSession] = useState(null)
  const [notices, setNotices] = useState([])
  const [modeIndex, setModeIndex] = useState(0)
  const [recentRecords, setRecentRecords] = useState([])
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)

  const mode = MODE_CYCLE[modeIndex % MODE_CYCLE.length]

  // Open classroom-specific WebSocket
  useEffect(() => {
    const id = parseInt(classroomId)
    if (!id) return

    const ws = createClassroomSocket(id, {
      onOpen: () => setWsConnected(true),
      onClose: () => setWsConnected(false),
      onError: () => setWsConnected(false),
      onMessage: (data) => {
        if (data.type === 'attendance_confirmed') {
          setRecentRecords(prev => [data, ...prev.slice(0, 9)])
        }
        if (data.type === 'session_state') {
          // Reload session when state changes
          fetchSession()
        }
      },
    })
    wsRef.current = ws
    return () => ws.close()
  }, [classroomId, createClassroomSocket])

  const fetchSession = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API}/sessions?classroom_id=${classroomId}&status=active&limit=1`
      )
      setSession(res.data.sessions?.[0] || null)
    } catch { /* ignore */ }
  }, [classroomId])

  const fetchNotices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/notices/active?classroom_id=${classroomId}`)
      setNotices(res.data.notices || [])
    } catch { /* ignore */ }
  }, [classroomId])

  useEffect(() => {
    fetchSession()
    fetchNotices()
    // Refresh notices every minute (auto-expiry handled server-side)
    const noticeInterval = setInterval(fetchNotices, 60000)
    return () => clearInterval(noticeInterval)
  }, [fetchSession, fetchNotices])

  // Mode cycling
  useEffect(() => {
    const t = setInterval(() => setModeIndex(i => i + 1), MODE_DURATION_MS)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Smart Classroom</h1>
            <p className="text-blue-300 mt-1">
              {session ? `Session: ${session.title}` : 'Waiting for active session…'}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-2 text-sm ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
              {wsConnected ? 'Live' : 'Reconnecting…'}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              {new Date().toLocaleDateString()} — Classroom {classroomId}
            </p>
          </div>
        </div>

        {/* Mode indicator pills */}
        <div className="flex justify-center gap-2 mb-8">
          {MODE_CYCLE.filter((v, i, arr) => arr.indexOf(v) === i).map(m => (
            <span key={m} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
            }`}>
              {m === 'attendance' ? '📸 Attendance' : m === 'info' ? '📚 Info' : '📢 Notices'}
            </span>
          ))}
        </div>

        {/* Attendance mode */}
        {mode === 'attendance' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center text-blue-300">
              Look at the Camera
            </h2>
            <div className="bg-gray-800 rounded-2xl p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recentRecords.slice(0, 8).map((r, i) => (
                  <div key={i} className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl mb-2">{r.status === 'present' ? '✅' : '⚠️'}</div>
                    <p className="font-bold truncate">{r.student_name || 'Student'}</p>
                    <p className="text-sm text-green-400 capitalize">{r.status}</p>
                    {r.similarity_score != null && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        sim: {r.similarity_score.toFixed(3)}
                      </p>
                    )}
                  </div>
                ))}
                {recentRecords.length === 0 && (
                  <div className="col-span-full text-center py-16 text-gray-400">
                    <p className="text-5xl mb-4">📷</p>
                    <p>Awaiting attendance events…</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info mode */}
        {mode === 'info' && (
          <div className="text-center py-16">
            <h2 className="text-5xl font-bold mb-4">
              {session ? session.title : 'Smart Classroom System'}
            </h2>
            {session ? (
              <div className="space-y-4">
                <p className="text-xl text-gray-300">
                  {new Date(session.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {new Date(session.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="inline-flex gap-4 mt-4">
                  <span className="px-4 py-2 bg-green-900/40 border border-green-500/30 rounded-xl text-green-300 text-sm">
                    {recentRecords.length} marked this view
                  </span>
                  <span className={`px-4 py-2 rounded-xl text-sm border ${
                    session.status === 'active'
                      ? 'bg-green-900/40 border-green-500/30 text-green-300'
                      : 'bg-gray-700 border-gray-500 text-gray-300'
                  }`}>
                    {session.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xl text-gray-400">System ready — no active session</p>
            )}
          </div>
        )}

        {/* Notice mode */}
        {mode === 'notice' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-center text-yellow-300 mb-6">
              📢 Notices
            </h2>
            {notices.length > 0 ? (
              notices.map(notice => (
                <div key={notice.id} className={`bg-gray-800 rounded-2xl p-6 border-l-4 ${
                  notice.priority > 1 ? 'border-red-500' :
                  notice.priority > 0 ? 'border-yellow-500' : 'border-blue-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-bold">{notice.title}</h3>
                    {notice.priority > 0 && (
                      <span className={`px-2 py-1 text-xs rounded ml-4 flex-shrink-0 ${
                        notice.priority > 1 ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {notice.priority > 1 ? '🔴 Urgent' : '🟡 Important'}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 mt-2 text-lg leading-relaxed">{notice.body}</p>
                  {notice.valid_until && (
                    <p className="text-xs text-gray-500 mt-3">
                      Expires: {new Date(notice.valid_until).toLocaleString()}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-4">📭</p>
                <p>No active notices</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
