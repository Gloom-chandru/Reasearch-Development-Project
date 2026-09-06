import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const API = '/api'

const STATUS_BADGE = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-yellow-100 text-yellow-700',
  'absent-unmarked': 'bg-red-100 text-red-700',
  manual: 'bg-purple-100 text-purple-700',
}

export default function SessionsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [attendanceModal, setAttendanceModal] = useState(null) // { session, records }
  const [correctionTarget, setCorrectionTarget] = useState(null) // attendance record
  const [correctionForm, setCorrectionForm] = useState({ new_status: 'present', reason: '' })

  const [form, setForm] = useState({
    classroom_id: '', subject_id: '', title: '',
    scheduled_start: '', scheduled_end: '',
    late_start_offset: 5, late_end_offset: 15,
  })

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/sessions?limit=100`),
      axios.get(`${API}/classrooms`),
      axios.get(`${API}/sessions/subjects`),
    ]).then(([sRes, cRes, subRes]) => {
      setSessions(sRes.data.sessions || [])
      setClassrooms(cRes.data.classrooms || [])
      setSubjects(subRes.data.subjects || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const refreshSessions = async () => {
    const res = await axios.get(`${API}/sessions?limit=100`)
    setSessions(res.data.sessions || [])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post(`${API}/sessions`, {
        ...form,
        classroom_id: parseInt(form.classroom_id),
        subject_id: parseInt(form.subject_id),
      })
      setShowForm(false)
      setSuccess('Session created')
      refreshSessions()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create session')
    }
  }

  const viewAttendance = async (session) => {
    try {
      const res = await axios.get(`${API}/sessions/${session.id}/attendance`)
      setAttendanceModal({ session, ...res.data })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load attendance')
    }
  }

  const activate = async (id) => {
    await axios.post(`${API}/sessions/${id}/activate`)
    refreshSessions()
  }

  const complete = async (id) => {
    if (!window.confirm('Mark session as completed? Absent records will be finalised for enrolled students.')) return
    await axios.post(`${API}/sessions/${id}/complete`)
    refreshSessions()
    if (attendanceModal?.session?.id === id) {
      const res = await axios.get(`${API}/sessions/${id}/attendance`)
      setAttendanceModal(prev => ({ ...prev, ...res.data }))
    }
  }

  const downloadReport = (sessionId) => {
    // Trigger file download — token must be passed as query param since we can't
    // set headers on a browser download link.
    const token = localStorage.getItem('token')
    const url = `${API}/reports/session/${sessionId}?token=${token}`
    const a = document.createElement('a')
    a.href = url
    a.download = `session_${sessionId}_attendance.xlsx`
    a.click()
  }

  const submitCorrection = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post(`${API}/sessions/attendance/correct`, {
        record_id: correctionTarget.id,
        new_status: correctionForm.new_status,
        reason: correctionForm.reason,
      })
      setCorrectionTarget(null)
      setSuccess('Attendance corrected')
      // Refresh attendance modal
      const res = await axios.get(`${API}/sessions/${attendanceModal.session.id}/attendance`)
      setAttendanceModal(prev => ({ ...prev, ...res.data }))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Correction failed')
    }
  }

  if (loading) return <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mt-8 rounded-full"></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sessions ({sessions.length})</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
          {showForm ? 'Cancel' : '+ New Session'}
        </button>
      </div>

      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}<button className="ml-2 underline" onClick={() => setError('')}>dismiss</button></div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select required value={form.classroom_id}
              onChange={e => setForm({ ...form, classroom_id: e.target.value })}
              className="px-3 py-2 border rounded-lg">
              <option value="">Select Classroom</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
            <select required value={form.subject_id}
              onChange={e => setForm({ ...form, subject_id: e.target.value })}
              className="px-3 py-2 border rounded-lg">
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
            <input required placeholder="Session Title" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="px-3 py-2 border rounded-lg md:col-span-2" />
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start Time</label>
              <input required type="datetime-local" value={form.scheduled_start}
                onChange={e => setForm({ ...form, scheduled_start: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End Time</label>
              <input required type="datetime-local" value={form.scheduled_end}
                onChange={e => setForm({ ...form, scheduled_end: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Late start offset (min after start)</label>
              <input type="number" min="0" value={form.late_start_offset}
                onChange={e => setForm({ ...form, late_start_offset: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Late end offset (min before end)</label>
              <input type="number" min="0" value={form.late_end_offset}
                onChange={e => setForm({ ...form, late_end_offset: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
            Create Session
          </button>
        </form>
      )}

      <div className="grid gap-3">
        {sessions.map(session => (
          <div key={session.id} className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{session.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(session.scheduled_start).toLocaleString()} →{' '}
                {new Date(session.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium ${
                session.status === 'active' ? 'bg-green-100 text-green-700' :
                session.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                session.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                'bg-blue-100 text-blue-700'
              }`}>{session.status}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => viewAttendance(session)}
                className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">
                📋 Attendance
              </button>
              <button onClick={() => downloadReport(session.id)}
                className="px-3 py-1.5 text-xs bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100">
                ⬇ Excel
              </button>
              {session.status === 'scheduled' && (
                <button onClick={() => activate(session.id)}
                  className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                  ▶ Activate
                </button>
              )}
              {session.status === 'active' && (
                <button onClick={() => complete(session.id)}
                  className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                  ■ Complete
                </button>
              )}
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-400">No sessions created yet</div>
        )}
      </div>

      {/* Attendance modal */}
      {attendanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-bold">{attendanceModal.session.title}</h3>
                <p className="text-xs text-gray-500">{new Date(attendanceModal.session.scheduled_start).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => downloadReport(attendanceModal.session.id)}
                  className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                  ⬇ Download Excel
                </button>
                <button onClick={() => setAttendanceModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700">{attendanceModal.present}</p>
                  <p className="text-xs text-green-600">Present</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-700">{attendanceModal.late}</p>
                  <p className="text-xs text-yellow-600">Late</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-700">{attendanceModal.absent}</p>
                  <p className="text-xs text-red-600">Absent</p>
                </div>
              </div>

              {/* Records table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs">
                    <tr>
                      <th className="text-left px-3 py-2">Student</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Decision</th>
                      <th className="text-right px-3 py-2">Similarity</th>
                      <th className="text-left px-3 py-2">Corrected</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(attendanceModal.records || []).map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <p className="font-medium">{r.student_name || `#${r.student_id}`}</p>
                          <p className="text-xs text-gray-400">{r.student_register_number}</p>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">{r.recognition_decision}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {r.similarity_score != null ? r.similarity_score.toFixed(4) : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {r.is_corrected && <span className="text-purple-600">✏ corrected</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => { setCorrectionTarget(r); setCorrectionForm({ new_status: r.status, reason: '' }) }}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                            Correct
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!attendanceModal.records || attendanceModal.records.length === 0) && (
                      <tr><td colSpan="6" className="px-3 py-8 text-center text-gray-400">No records yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Correction modal */}
      {correctionTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Correct Attendance</h3>
            <p className="text-sm text-gray-600 mb-4">
              Student: <strong>{correctionTarget.student_name}</strong><br/>
              Current status: <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_BADGE[correctionTarget.status] || ''}`}>{correctionTarget.status}</span>
            </p>
            <form onSubmit={submitCorrection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">New Status</label>
                <select value={correctionForm.new_status}
                  onChange={e => setCorrectionForm({ ...correctionForm, new_status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg">
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent-unmarked">Absent</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea required rows={3} placeholder="Mandatory: explain why this correction is needed"
                  value={correctionForm.reason}
                  onChange={e => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  Apply Correction
                </button>
                <button type="button" onClick={() => setCorrectionTarget(null)}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
