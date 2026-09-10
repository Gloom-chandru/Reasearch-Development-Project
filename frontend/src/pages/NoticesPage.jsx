import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const API = '/api'

const PRIORITY = {
  0: { label: 'Normal',    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',    dot: 'bg-blue-400',    tvBorder: 'border-blue-500',    tvBadge: 'text-blue-400' },
  1: { label: 'Important', badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30', dot: 'bg-yellow-400', tvBorder: 'border-yellow-500', tvBadge: 'text-yellow-400' },
  2: { label: 'Urgent',    badge: 'bg-red-500/20 text-red-300 border border-red-500/30',        dot: 'bg-red-400',     tvBorder: 'border-red-500',     tvBadge: 'text-red-400' },
}

const DISPLAY_DURATIONS = [
  { value: 5,  label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 1440, label: '1 day' },
]

// ── TV Preview — simulates exactly how it looks on the classroom display ──
function TVPreview({ title, body, priority, classroomName, displayMinutes, pushed }) {
  const pri = PRIORITY[priority] || PRIORITY[0]
  const barRef = useRef(null)
  const [barWidth, setBarWidth] = useState(100)

  // Animate the progress bar countdown
  useEffect(() => {
    if (!pushed) { setBarWidth(100); return }
    setBarWidth(100)
    const total = 4000   // 4s demo animation
    const step  = 50
    let elapsed = 0
    const t = setInterval(() => {
      elapsed += step
      const pct = Math.max(0, 100 - (elapsed / total) * 100)
      setBarWidth(pct)
      if (pct <= 0) clearInterval(t)
    }, step)
    return () => clearInterval(t)
  }, [pushed])

  return (
    <div className="rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
      {/* TV chrome bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-gray-400 text-xs font-mono ml-2">
            CLASSROOM TV — {classroomName || 'ALL ROOMS'}
          </span>
        </div>
        <span className="text-gray-500 text-xs font-mono">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* TV screen content */}
      <div className="bg-gray-950 p-5 min-h-[160px]">
        {title ? (
          <div>
            {/* Priority badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${pri.dot} animate-pulse`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${pri.tvBadge}`}>
                {pri.label} notice
              </span>
            </div>

            {/* Title */}
            <h2 className="text-white text-lg font-bold leading-tight mb-2">
              {title}
            </h2>

            {/* Body */}
            {body && (
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                {body}
              </p>
            )}

            {/* Auto-hide bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600 text-xs font-mono">
                  Auto-hides in {displayMinutes} min{displayMinutes !== 1 ? 's' : ''}
                </span>
                {pushed && (
                  <span className="text-green-400 text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${
                    priority >= 2 ? 'bg-red-500' : priority >= 1 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[120px] text-gray-700 text-sm">
            Notice preview appears here
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function NoticesPage() {
  const { user } = useAuth()
  const [notices, setNotices]     = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [pushed, setPushed]       = useState(false)

  const [form, setForm] = useState({
    title:        '',
    body:         '',
    priority:     2,        // default: Urgent (matches image)
    classroom_id: '',
    displayMins:  5,        // display duration (not stored in DB — just sets valid_until)
    showOnTVs:    true,
  })

  useEffect(() => {
    Promise.all([fetchNotices(), fetchClassrooms()])
      .finally(() => setLoading(false))
  }, [])

  const fetchNotices = async () => {
    try {
      const r = await axios.get(`${API}/notices`)
      setNotices(r.data.notices || [])
    } catch (err) {
      setError('Failed to load notices: ' + (err.response?.data?.detail || err.message))
    }
  }

  const fetchClassrooms = async () => {
    try {
      const r = await axios.get(`${API}/classrooms`)
      setClassrooms(r.data.classrooms || [])
    } catch { /* non-critical */ }
  }

  const handlePublish = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.body.trim())  { setError('Body is required');  return }

    try {
      const now       = new Date()
      const validUntil = new Date(now.getTime() + form.displayMins * 60 * 1000)

      await axios.post(`${API}/notices`, {
        title:       form.title,
        body:        form.body,
        priority:    parseInt(form.priority),
        classroom_id: form.classroom_id ? parseInt(form.classroom_id) : null,
        valid_from:  now.toISOString(),
        valid_until: form.showOnTVs ? validUntil.toISOString() : null,
      })

      setPushed(true)
      setSuccess('Notice pushed to classroom TVs!')
      fetchNotices()
      setTimeout(() => {
        setSuccess('')
        setPushed(false)
        setForm({ title:'', body:'', priority:2, classroom_id:'', displayMins:5, showOnTVs:true })
      }, 4000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to publish notice')
    }
  }

  const handleDeactivate = async (id) => {
    try {
      await axios.post(`${API}/notices/${id}/deactivate`)
      fetchNotices()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to deactivate')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notice permanently?')) return
    try {
      await axios.delete(`${API}/notices/${id}`)
      fetchNotices()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete')
    }
  }

  const isExpired = (n) => n.valid_until && new Date(n.valid_until) < new Date()
  const selectedClassroom = classrooms.find(c => c.id === parseInt(form.classroom_id))
  const pri = PRIORITY[form.priority] || PRIORITY[0]

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
    </div>
  )

  return (
    <div className="space-y-8">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">LED TV Notice Display</h2>
          <p className="text-sm text-gray-500 mt-0.5">Post notices directly to classroom TV screens</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''} connected
        </div>
      </div>

      {/* ── Feedback banners ── */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-medium">{success}</p>
            <p className="text-xs text-green-600 mt-0.5">
              Visible on all connected classroom displays for {form.displayMins} minute{form.displayMins !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {/* ── Main two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT — Notice composer */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📢</span>
                <span className="font-semibold text-gray-900">New notice</span>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${pri.badge}`}>
                {pri.label}
              </span>
            </div>

            <form onSubmit={handlePublish} className="p-6 space-y-5">

              {/* Title */}
              <div>
                <input
                  required
                  placeholder="Notice title — e.g. Face Enrollment Mandatory — Deadline: Friday"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full text-base font-semibold text-gray-900 placeholder:text-gray-400
                             border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none
                             pb-2 transition-colors bg-transparent"
                />
              </div>

              {/* Body */}
              <div>
                <textarea
                  required
                  rows={3}
                  placeholder="Notice body — what do students need to know?"
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  className="w-full text-sm text-gray-700 placeholder:text-gray-400
                             border border-gray-200 rounded-xl px-4 py-3
                             focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Priority selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Priority level</label>
                <div className="flex gap-2">
                  {[0, 1, 2].map(p => {
                    const pp = PRIORITY[p]
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm({ ...form, priority: p })}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          parseInt(form.priority) === p
                            ? `${pp.badge} scale-105 shadow-sm`
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {pp.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Classroom selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Target classroom</label>
                <select
                  value={form.classroom_id}
                  onChange={e => setForm({ ...form, classroom_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">📺 All classrooms</option>
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              {/* Show on TVs + Duration row */}
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📺</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Show on classroom TVs</p>
                    <p className="text-xs text-gray-400">Displays immediately on LED screens</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Duration selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Display for</span>
                    <select
                      value={form.displayMins}
                      onChange={e => setForm({ ...form, displayMins: parseInt(e.target.value) })}
                      disabled={!form.showOnTVs}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs font-medium
                                 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-40"
                    >
                      {DISPLAY_DURATIONS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, showOnTVs: !form.showOnTVs })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      form.showOnTVs ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.showOnTVs ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Push button */}
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                           font-semibold text-sm flex items-center justify-center gap-2
                           active:scale-95 transition-all shadow-sm"
              >
                <span>↓</span>
                <span>Push to {form.classroom_id ? selectedClassroom?.name || 'classroom' : 'every classroom TV'}</span>
              </button>

              {form.showOnTVs && (
                <p className="text-xs text-center text-gray-400">
                  Pushed live to every classroom TV
                </p>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT — Live TV Preview */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Live Preview — How it looks on the LED TV
            </p>
            <TVPreview
              title={form.title}
              body={form.body}
              priority={parseInt(form.priority)}
              classroomName={selectedClassroom?.name || (form.classroom_id ? '' : 'ALL ROOMS')}
              displayMinutes={form.displayMins}
              pushed={pushed}
            />
          </div>

          {/* Active notices list */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 mt-6">
              Active on TV screens now
            </p>
            <div className="space-y-2">
              {notices.filter(n => n.is_active && !isExpired(n)).length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed">
                  No active notices on any TV right now
                </div>
              )}
              {notices.filter(n => n.is_active && !isExpired(n)).map(n => {
                const p = PRIORITY[n.priority] || PRIORITY[0]
                return (
                  <div key={n.id}
                    className="bg-gray-950 rounded-xl border border-gray-800 p-4 relative overflow-hidden">
                    {/* Priority left bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      n.priority === 2 ? 'bg-red-500' : n.priority === 1 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div className="pl-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${p.tvBadge} uppercase`}>
                            {p.label}
                          </span>
                          {n.classroom_id && (
                            <span className="text-xs text-gray-500">· Room #{n.classroom_id}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeactivate(n.id)}
                            className="text-xs text-gray-500 hover:text-yellow-400 transition-colors"
                          >
                            Hide
                          </button>
                          {['super_admin', 'hod', 'coordinator'].includes(user?.role) && (
                            <button
                              onClick={() => handleDelete(n.id)}
                              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-white text-sm font-semibold">{n.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{n.body}</p>
                      {n.valid_until && (
                        <p className="text-gray-600 text-xs mt-1">
                          Expires {new Date(n.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Past / inactive notices */}
          {notices.filter(n => !n.is_active || isExpired(n)).length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                Show past notices ({notices.filter(n => !n.is_active || isExpired(n)).length})
              </summary>
              <div className="space-y-2 mt-2">
                {notices.filter(n => !n.is_active || isExpired(n)).map(n => {
                  const p = PRIORITY[n.priority] || PRIORITY[0]
                  return (
                    <div key={n.id}
                      className="bg-gray-50 rounded-xl border border-gray-200 p-3 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${p.dot} opacity-40`} />
                          <span className="text-sm font-medium text-gray-700">{n.title}</span>
                          {isExpired(n) && (
                            <span className="text-xs text-red-400 bg-red-50 px-1.5 py-0.5 rounded">Expired</span>
                          )}
                          {!n.is_active && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Hidden</span>
                          )}
                        </div>
                        {['super_admin', 'hod', 'coordinator'].includes(user?.role) && (
                          <button onClick={() => handleDelete(n.id)}
                            className="text-xs text-gray-400 hover:text-red-500">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
