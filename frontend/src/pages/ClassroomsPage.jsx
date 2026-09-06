import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const API = '/api'

const emptyForm = {
  name: '', code: '', floor: '', capacity: '',
  entry_zone_x1: 0.2, entry_zone_y1: 0.2,
  entry_zone_x2: 0.8, entry_zone_y2: 0.8,
}

export default function ClassroomsPage() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRoom, setEditRoom] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Per-classroom enrollment panel
  const [enrollPanel, setEnrollPanel] = useState(null) // classroom object
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [enrollSubjectId, setEnrollSubjectId] = useState('')

  const canManage = ['super_admin', 'hod', 'coordinator'].includes(user?.role)

  useEffect(() => { fetchClassrooms() }, [])

  const fetchClassrooms = async () => {
    try {
      const res = await axios.get(`${API}/classrooms`)
      setClassrooms(res.data.classrooms || [])
    } catch (err) {
      setError('Failed to load classrooms — is the backend running?')
    }
    finally { setLoading(false) }
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditRoom(null)
    setError('')
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        floor: form.floor !== '' ? parseInt(form.floor) : null,
        capacity: form.capacity !== '' ? parseInt(form.capacity) : null,
        entry_zone_x1: parseFloat(form.entry_zone_x1),
        entry_zone_y1: parseFloat(form.entry_zone_y1),
        entry_zone_x2: parseFloat(form.entry_zone_x2),
        entry_zone_y2: parseFloat(form.entry_zone_y2),
      }
      if (editRoom) {
        await axios.put(`${API}/classrooms/${editRoom.id}`, payload)
        setSuccess(`Updated ${form.name}`)
      } else {
        await axios.post(`${API}/classrooms`, payload)
        setSuccess(`Created classroom ${form.name}`)
      }
      resetForm()
      fetchClassrooms()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed')
    }
  }

  const openEnrollPanel = async (room) => {
    setEnrollPanel(room)
    try {
      const [sRes, subRes, enrRes] = await Promise.all([
        axios.get(`${API}/students?limit=500`),
        axios.get(`${API}/sessions/subjects`),
        axios.get(`${API}/classrooms/${room.id}/enrollments`),
      ])
      setStudents(sRes.data.students || [])
      setSubjects(subRes.data.subjects || [])
      setEnrollments(enrRes.data.enrollments || [])
    } catch (err) {
      setError('Failed to load enrollment data: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!enrollStudentId) return
    try {
      await axios.post(`${API}/classrooms/${enrollPanel.id}/enrollments`, {
        student_ids: [parseInt(enrollStudentId)],
        subject_id: enrollSubjectId ? parseInt(enrollSubjectId) : null,
      })
      const res = await axios.get(`${API}/classrooms/${enrollPanel.id}/enrollments`)
      setEnrollments(res.data.enrollments || [])
      setEnrollStudentId('')
      setSuccess('Student enrolled')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Enrollment failed')
    }
  }

  const handleUnenroll = async (enrollmentId) => {
    await axios.delete(`${API}/classrooms/${enrollPanel.id}/enrollments/${enrollmentId}`)
    const res = await axios.get(`${API}/classrooms/${enrollPanel.id}/enrollments`)
    setEnrollments(res.data.enrollments || [])
  }

  if (loading) return <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mt-8 rounded-full"></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Classrooms ({classrooms.length})</h2>
        {canManage && (
          <button onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Add Classroom
          </button>
        )}
      </div>

      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}<button className="ml-2 underline" onClick={() => setError('')}>dismiss</button></div>}

      {/* Create/edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border space-y-4">
          <h3 className="font-semibold">{editRoom ? `Edit: ${editRoom.name}` : 'New Classroom'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Name (e.g. Lab 101)" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input required placeholder="Code (e.g. LAB101)" value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Floor" type="number" value={form.floor}
              onChange={e => setForm({ ...form, floor: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Capacity" type="number" value={form.capacity}
              onChange={e => setForm({ ...form, capacity: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Entry zone */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Entry Zone (fractions of frame, 0–1).{' '}
              <span className="font-normal text-gray-500">
                Note: 2D centroid approximation — see §7.5 of project spec.
              </span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['entry_zone_x1', 'X1'], ['entry_zone_y1', 'Y1'], ['entry_zone_x2', 'X2'], ['entry_zone_y2', 'Y2']].map(([key, label]) => (
                <label key={key} className="text-xs text-gray-600">
                  {label}
                  <input type="number" min="0" max="1" step="0.05" value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="mt-1 block w-full px-3 py-1.5 border rounded focus:ring-2 focus:ring-blue-500 text-sm" />
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
              {editRoom ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Classroom cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classrooms.map(room => (
          <div key={room.id} className="bg-white rounded-xl border p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{room.name}</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{room.code}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {room.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              {room.floor != null && <p>Floor: {room.floor}</p>}
              {room.capacity != null && <p>Capacity: {room.capacity}</p>}
              <p>Zone: ({room.entry_zone_x1?.toFixed(2)},{room.entry_zone_y1?.toFixed(2)}) → ({room.entry_zone_x2?.toFixed(2)},{room.entry_zone_y2?.toFixed(2)})</p>
            </div>
            {canManage && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => {
                  setEditRoom(room)
                  setForm({ ...room, floor: room.floor ?? '', capacity: room.capacity ?? '' })
                  setShowForm(true)
                }} className="flex-1 px-2 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                  Edit
                </button>
                <button onClick={() => openEnrollPanel(room)}
                  className="flex-1 px-2 py-1.5 text-xs bg-teal-50 text-teal-700 rounded hover:bg-teal-100">
                  Enrollments
                </button>
                <a href={`/display/${room.id}`} target="_blank" rel="noreferrer"
                  className="flex-1 px-2 py-1.5 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-center">
                  Display ↗
                </a>
              </div>
            )}
          </div>
        ))}
        {classrooms.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">No classrooms yet</div>
        )}
      </div>

      {/* Enrollment panel modal */}
      {enrollPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">Enrollments — {enrollPanel.name}</h3>
              <button onClick={() => setEnrollPanel(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Enroll a student */}
              <form onSubmit={handleEnroll} className="flex gap-3">
                <select value={enrollStudentId} onChange={e => setEnrollStudentId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Select student…</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.register_number} — {s.full_name}</option>
                  ))}
                </select>
                <select value={enrollSubjectId} onChange={e => setEnrollSubjectId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">All subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  Enroll
                </button>
              </form>

              {/* Current enrollments */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2">Reg No</th>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Subject</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {enrollments.map(e => (
                      <tr key={e.enrollment_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs">{e.register_number}</td>
                        <td className="px-3 py-2">{e.student_name}</td>
                        <td className="px-3 py-2 text-gray-500">{e.subject_id ? `#${e.subject_id}` : 'All'}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => handleUnenroll(e.enrollment_id)}
                            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {enrollments.length === 0 && (
                      <tr><td colSpan="4" className="px-3 py-6 text-center text-gray-400">No enrolled students</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
