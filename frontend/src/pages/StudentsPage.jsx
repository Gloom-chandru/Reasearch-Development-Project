import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    register_number: '', full_name: '', department: '', section: '', email: ''
  })
  const [error, setError] = useState('')

  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API}/students?limit=200`)
      setStudents(res.data.students || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post(`${API}/students`, form)
      setShowForm(false)
      setForm({ register_number: '', full_name: '', department: '', section: '', email: '' })
      fetchStudents()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create student')
    }
  }

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mt-8"></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Students ({students.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required placeholder="Register Number"
              value={form.register_number}
              onChange={e => setForm({...form, register_number: e.target.value})}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              required placeholder="Full Name"
              value={form.full_name}
              onChange={e => setForm({...form, full_name: e.target.value})}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              required placeholder="Department"
              value={form.department}
              onChange={e => setForm({...form, department: e.target.value})}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              required placeholder="Section"
              value={form.section}
              onChange={e => setForm({...form, section: e.target.value})}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              placeholder="Email (optional)"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
            Create Student
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reg No</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Section</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-900">{s.register_number}</td>
                  <td className="px-4 py-3 text-gray-900">{s.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.department}</td>
                  <td className="px-4 py-3 text-gray-600">{s.section}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
                      {s.enrollment_count} samples
                    </span>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No students registered</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}