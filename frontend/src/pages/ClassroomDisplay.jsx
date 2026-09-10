import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useWebSocket } from '../contexts/WebSocketContext'
import axios from 'axios'

const API = '/api'
const MODE_CYCLE       = ['attendance', 'info', 'notice', 'info']
const MODE_DURATION_MS = 15000

// ── UTC date parser — backend sends naive datetime strings (no Z suffix) ─────
// Without this, browsers in IST/CST etc. treat the string as local time,
// making a "5 minute" notice appear to expire immediately.
const parseUTC = (s) => {
  if (!s) return null
  if (s.endsWith('Z') || s.includes('+')) return new Date(s)
  return new Date(s + 'Z')
}

// Real countdown bar — uses actual valid_until from the notice
function NoticeCountdown({ notice }) {
  const [pct, setPct]       = useState(100)
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!notice?.valid_until) { setPct(100); setTimeLeft(null); return }

    const tick = () => {
      const now      = Date.now()
      const end      = parseUTC(notice.valid_until).getTime()
      const from     = parseUTC(notice.valid_from).getTime()
      const totalMs  = Math.max(end - from, 1)
      const remaining = Math.max(0, end - now)
      setPct((remaining / totalMs) * 100)
      const secs = Math.ceil(remaining / 1000)
      setTimeLeft(secs)
    }

    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [notice?.id, notice?.valid_until])

  const formatTime = (s) => {
    if (s === null || s === undefined) return ''
    if (s <= 0)   return 'Expiring…'
    if (s < 60)   return `${s}s remaining`
    if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s remaining`
    return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m remaining`
  }

  const barColor = notice?.priority >= 2 ? 'bg-red-500'
                 : notice?.priority >= 1 ? 'bg-yellow-500'
                 : 'bg-blue-500'

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-gray-500 text-xs font-mono">{formatTime(timeLeft)}</span>
        <span className="text-green-400 text-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          LIVE
        </span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function ClassroomDisplay() {
  const { classroomId } = useParams()
  const { createClassroomSocket } = useWebSocket()

  const [session, setSession]           = useState(null)
  const [notices, setNotices]           = useState([])
  const [modeIndex, setModeIndex]       = useState(0)
  const [recentRecords, setRecentRecords] = useState([])
  const [wsConnected, setWsConnected]   = useState(false)
  const [ledState, setLedState]         = useState(null)
  const [clock, setClock]               = useState(new Date())

  const ledTimerRef  = useRef(null)
  const wsRef        = useRef(null)
  const modeTimerRef = useRef(null)

  const mode = MODE_CYCLE[modeIndex % MODE_CYCLE.length]

  // Active notices for this classroom
  const activeNotices = notices.filter(n => {
    if (!n.is_active) return false
    if (n.valid_until && parseUTC(n.valid_until) < new Date()) return false
    return !n.classroom_id || parseInt(n.classroom_id) === parseInt(classroomId)
  })

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // WebSocket
  useEffect(() => {
    const id = parseInt(classroomId)
    if (!id) return
    const ws = createClassroomSocket(id, {
      onOpen:  () => setWsConnected(true),
      onClose: () => setWsConnected(false),
      onError: () => setWsConnected(false),
      onMessage: (data) => {
        if (data.type === 'attendance_confirmed') {
          setRecentRecords(prev => [data, ...prev.slice(0, 9)])
        }
        if (data.type === 'session_state') fetchSession()
        if (data.type === 'led_event') {
          setLedState(data)
          clearTimeout(ledTimerRef.current)
          ledTimerRef.current = setTimeout(() => setLedState(null), 2500)
        }
        if (data.type === 'notice_pushed') {
          // New notice pushed — jump to notice mode immediately
          fetchNotices()
          setModeIndex(MODE_CYCLE.indexOf('notice'))
        }
      },
    })
    wsRef.current = ws
    return () => ws.close()
  }, [classroomId, createClassroomSocket])

  const fetchSession = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sessions?classroom_id=${classroomId}&status=active&limit=1`)
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
    const noticeInterval = setInterval(fetchNotices, 30000)  // refresh every 30s
    return () => {
      clearInterval(noticeInterval)
      clearTimeout(ledTimerRef.current)
    }
  }, [fetchSession, fetchNotices])

  // Mode cycling — but skip to notice mode when notices are active
  useEffect(() => {
    clearInterval(modeTimerRef.current)
    modeTimerRef.current = setInterval(() => {
      setModeIndex(i => {
        const next = (i + 1) % MODE_CYCLE.length
        return next
      })
    }, MODE_DURATION_MS)
    return () => clearInterval(modeTimerRef.current)
  }, [])

  // When a new notice appears, jump to notice mode within 2 seconds
  useEffect(() => {
    if (activeNotices.length > 0 && mode !== 'notice') {
      const t = setTimeout(() => {
        setModeIndex(MODE_CYCLE.indexOf('notice'))
      }, 2000)
      return () => clearTimeout(t)
    }
  }, [activeNotices.length])

  const topNotice = activeNotices[0] || null
  const priorityColor = topNotice?.priority >= 2 ? 'border-red-500' : topNotice?.priority >= 1 ? 'border-yellow-500' : 'border-blue-500'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Smart Classroom</h1>
            <p className="text-blue-300 text-sm mt-0.5">
              {session ? `📚 ${session.title}` : 'Waiting for active session…'}
            </p>
          </div>
          <div className="text-right">
            {/* Clock */}
            <p className="text-2xl font-mono font-bold text-white">
              {clock.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </p>
            <div className="flex items-center justify-end gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-400">
                {wsConnected ? 'Live' : 'Reconnecting…'} · Room {classroomId}
              </span>
            </div>
          </div>
        </div>

        {/* LED Simulation Widget */}
        <div className="mb-5">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300 ${
            ledState?.state === 'present' ? 'bg-green-900/60 border-green-500' :
            ledState?.state === 'late'    ? 'bg-yellow-900/60 border-yellow-500' :
            ledState?.state === 'unknown' ? 'bg-red-900/60 border-red-500' :
            'bg-gray-800/40 border-gray-600'
          }`}>
            <div className={`w-5 h-5 rounded-full flex-shrink-0 transition-all ${
              ledState?.state === 'present' ? 'bg-green-400 animate-pulse shadow-md shadow-green-400' :
              ledState?.state === 'late'    ? 'bg-yellow-400 animate-pulse shadow-md shadow-yellow-400' :
              ledState?.state === 'unknown' ? 'bg-red-400 animate-pulse shadow-md shadow-red-400' :
              'bg-gray-600'
            }`} />
            <div className="flex-1 min-w-0 text-sm font-medium">
              {ledState ? (
                <>
                  {ledState.state === 'present' && <span className="text-green-300">✓ Present — {ledState.student_name}</span>}
                  {ledState.state === 'late'    && <span className="text-yellow-300">⚠ Late — {ledState.student_name}</span>}
                  {ledState.state === 'unknown' && <span className="text-red-300">? Unknown face</span>}
                </>
              ) : (
                <span className="text-xs text-gray-500">LED indicator — idle</span>
              )}
            </div>
            <span className="text-xs text-gray-500 border border-gray-600 px-2 py-0.5 rounded flex-shrink-0">
              ⚠ SOFTWARE SIMULATION
            </span>
          </div>
        </div>

        {/* ── NOTICE BANNER — shows at top whenever a notice is active ── */}
        {topNotice && (
          <div className={`mb-5 rounded-2xl border-2 ${priorityColor} bg-gray-900/80 p-5 
                          ${mode === 'notice' ? '' : 'opacity-90'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${
                    topNotice.priority >= 2 ? 'bg-red-400' : topNotice.priority >= 1 ? 'bg-yellow-400' : 'bg-blue-400'
                  }`} />
                  <span className={`text-xs font-bold uppercase tracking-widest ${
                    topNotice.priority >= 2 ? 'text-red-400' : topNotice.priority >= 1 ? 'text-yellow-400' : 'text-blue-400'
                  }`}>
                    {topNotice.priority >= 2 ? '🔴 Urgent Notice' : topNotice.priority >= 1 ? '🟡 Important Notice' : '📢 Notice'}
                  </span>
                  {activeNotices.length > 1 && (
                    <span className="text-gray-500 text-xs">+{activeNotices.length - 1} more</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white leading-snug">{topNotice.title}</h2>
                <p className="text-gray-300 text-sm mt-1 leading-relaxed">{topNotice.body}</p>
                <NoticeCountdown notice={topNotice} />
              </div>
            </div>
          </div>
        )}

        {/* Mode indicator pills */}
        <div className="flex justify-center gap-2 mb-6">
          {MODE_CYCLE.filter((v, i, arr) => arr.indexOf(v) === i).map(m => (
            <span key={m} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
            }`}>
              {m === 'attendance' ? '📸 Attendance' : m === 'info' ? '📚 Info' : '📢 Notices'}
            </span>
          ))}
        </div>

        {/* ── Attendance mode ── */}
        {mode === 'attendance' && (
          <div>
            <h2 className="text-xl font-semibold text-center text-blue-300 mb-4">
              Look at the Camera
            </h2>
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recentRecords.slice(0, 8).map((r, i) => (
                  <div key={i} className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl mb-2">{r.status === 'present' ? '✅' : '⚠️'}</div>
                    <p className="font-bold truncate text-sm">{r.student_name || 'Student'}</p>
                    <p className="text-xs text-green-400 capitalize">{r.status}</p>
                    {r.similarity_score != null && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        {r.similarity_score.toFixed(3)}
                      </p>
                    )}
                  </div>
                ))}
                {recentRecords.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-400">
                    <p className="text-5xl mb-3">📷</p>
                    <p>Awaiting attendance events…</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Info mode ── */}
        {mode === 'info' && (
          <div className="text-center py-12">
            <h2 className="text-5xl font-bold mb-4">
              {session ? session.title : 'Smart Classroom System'}
            </h2>
            {session ? (
              <div className="space-y-4">
                <p className="text-xl text-gray-300">
                  {new Date(session.scheduled_start).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                  {' — '}
                  {new Date(session.scheduled_end).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                </p>
                <div className="inline-flex gap-4">
                  <span className="px-4 py-2 bg-green-900/40 border border-green-500/30 rounded-xl text-green-300 text-sm">
                    {recentRecords.length} marked
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
              <p className="text-xl text-gray-400">No active session</p>
            )}
          </div>
        )}

        {/* ── Notice mode ── */}
        {mode === 'notice' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center text-yellow-300 mb-4">📢 Notices</h2>
            {activeNotices.length > 0 ? (
              activeNotices.map(notice => (
                <div key={notice.id} className={`bg-gray-900 rounded-2xl p-6 border-2 ${
                  notice.priority >= 2 ? 'border-red-500' :
                  notice.priority >= 1 ? 'border-yellow-500' : 'border-blue-500'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${
                          notice.priority >= 2 ? 'bg-red-400' : notice.priority >= 1 ? 'bg-yellow-400' : 'bg-blue-400'
                        }`} />
                        <span className={`text-xs font-bold uppercase tracking-widest ${
                          notice.priority >= 2 ? 'text-red-400' : notice.priority >= 1 ? 'text-yellow-400' : 'text-blue-400'
                        }`}>
                          {notice.priority >= 2 ? '🔴 Urgent' : notice.priority >= 1 ? '🟡 Important' : 'Notice'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-white">{notice.title}</h3>
                      <p className="text-gray-300 mt-2 text-lg leading-relaxed">{notice.body}</p>
                      <NoticeCountdown notice={notice} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p className="text-5xl mb-4">📭</p>
                <p>No active notices</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
