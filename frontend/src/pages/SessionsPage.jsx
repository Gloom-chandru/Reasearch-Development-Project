const viewAttendance = async (sessionId) => {
    const res = await axios.get(`${API}/sessions/${sessionId}/attendance`)
    setAttendance(res.data)
    setSelectedSession(sessions.find(s => s.id === sessionId))
  }

  const activateSession = async (sessionId) => {
    await axios.post(`${API}/sessions/${sessionId}/activate`)
    const res = await axios.get(`${API}/sessions?limit=100`)
    setSessions(res.data.sessions || [])
  }

  const completeSession = async (sessionId) => {
    await axios.post(`${API}/sessions/${sessionId}/complete`)
    const res = await axios.get(`${API}/sessions?limit=100`)
    setSessions(res.data.sessions || [])
  }

  if (loading) return <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mt-8"></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sessions ({sessions.length})</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          {showForm ? 'Cancel' : '+ New Session'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select required value={form.classroom_id}
              onChange={e => setForm({...form, classroom_id: e.target.value})}
              className="px-3 py-2 border rounded-lg">
              <option value="">Select Classroom</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
            <select required value={form.subject_id}
              onChange={e => setForm({...form, subject_id: e.target.value})}
              className="px-3 py-2 border rounded-lg">
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
            <input required placeholder="Title" value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              className="px-3 py-2 border rounded-lg" />
            <input required type="datetime-local" value={form.scheduled_start}
              onChange={e => setForm({...form, scheduled_start: e.target.value})}
              className="px-3 py-2 border rounded-lg" />
            <input required type="datetime-local" value={form.scheduled_end}
              onChange={e => setForm({...form, scheduled_end: e.target.value})}
              className="px-3 py-2 border rounded-lg" />
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">
            Create Session
          </button>
        </form>
      )}
import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api'

export default function SessionsPage() {
  const [sessions, setSessions] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [attendance, setAttendance] = useState(null)
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
    }).finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    await axios.post(`${API}/sessions`, {
      ...form,
      classroom_id: parseInt(form.classroom_id),
      subject_id: parseInt(form.subject_id),
    })
    setShowForm(false)
    const res = await axios.get(`${API}/sessions?limit=100`)
    setSessions(res.data.sessions || [])
  }<div className="grid gap-4">
        {sessions.map(session => (
          <div key={session.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{session.title}</h3>
              <p className="text-sm text-gray-500">
                {new Date(session.scheduled_start).toLocaleDateString()} {new Date(session.scheduled_start).toLocaleTimeString()}
              </p>
              <span className={'inline-block mt-1 px-2 py-0.5 text-xs rounded-full ' + (
                session.status === 'active' ? 'bg-green-100 text-green-700' :
                session.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                'bg-blue-100 text-blue-700'
              )}>{session.status}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => viewAttendance(session.id)}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg">Attendance</button>
              {session.status === 'scheduled' && (
                <button onClick={() => activateSession(session.id)}
                  className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg">Activate</button>
              )}
              {session.status === 'active' && (
                <button onClick={() => completeSession(session.id)}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg">Complete</button>
              )}
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-400">No sessions created yet</div>
        )}
      </div>

      {attendance && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{selectedSession.title} - Attendance</h3>
              <button onClick={() => { setAttendance(null); setSelectedSession(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl">X</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">{attendance.present}</p>
                <p className="text-xs text-green-600">Present</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-700">{attendance.late}</p>
                <p className="text-xs text-yellow-600">Late</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-700">{attendance.absent}</p>
                <p className="text-xs text-red-600">Absent</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Student</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Decision</th>
                  <th className="text-left px-3 py-2">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attendance.records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{r.student_name || '#' + r.student_id}</td>
                    <td className="px-3 py-2">
                      <span className={'px-2 py-0.5 text-xs rounded-full ' + (
                        r.status === 'present' ? 'bg-green-100 text-green-700' :
                        r.status === 'late' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      )}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.recognition_decision}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.similarity_score ? r.similarity_score.toFixed(4) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}