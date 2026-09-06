import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const API = '/api'

const PRIORITY_LABELS = {
  0: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  1: { label: 'Important', color: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
}

export default function NoticesPage() {
  const { user } = useAuth()
  const [notices, setNotices] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    title: '', body: '', priority: 0,
    classroom_id: '', valid_from: '', valid_until: '',
  })

  useEffect(() => {
    Promise.all([fetchNotices(), fetchClassrooms()])
      .finally(() => setLoading(false))
  }, [])

  const fetchNotices = async () => {
    try {
      const res = await axios.get(`${API}/notices`)
      setNotices(res.data.notices || [])
    } catch { /* ignore */ }
  }

  const fetchClassrooms = async () => {
    try {
      const res = await axios.get(`${API}/classrooms`)
      setClassrooms(res.data.classrooms || [])
    } catch { /* ignore */ }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        title: form.title,
        body: form.body,
        priority: parseInt(form.priority),
        classroom_id: form.classroom_id ? parseInt(form.classroom_id) : null,
        valid_from: form.valid_from || new Date().toISOString(),
        valid_until: form.valid_until || null,
      }
      await axios.post(`${API}/notices`, payload)
      setSuccess('Notice created')
      setShowForm(false)
      setForm({ title: '', body: '', priority: 0, classroom_id: '', valid_from: '', valid_until: '' })
      fetchNotices()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create notice')
    }
  }

  const handleDeactivate = async (id) => {
    try {
      await axios.post(`${API}/notices/${id}/deactivate`)
      setSuccess('Notice deactivated')
      fetchNotices()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to deactivate')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notice permanently?')) return
    try {
      await axios.delete(`${API}/notices/${id}`)
      setSuccess('Notice deleted')
      fetchNotices()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete')
    }
  }

  const isExpired = (n) => n.valid_until && new Date(n.valid_until) < new Date()

  if (loading) return <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mt-8 rounded-full"></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Notices ({notices.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          {showForm ? 'Cancel' : '+ New Notice'}
        </button>
      </div>

      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border space-y-4">
          <h3 className="font-semibold text-gray-900">Create Notice</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Title" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 md:col-span-2" />
            <textarea required placeholder="Notice body" rows={4} value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 md:col-span-2" />
            <div>
              <label className="block text-xs text-gray-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg">
                <option value={0}>Normal</option>
                <option value={1}>Important</option>
                <option value={2}>Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Target Classroom (optional — blank = all)</label>
              <select value={form.classroom_id} onChange={e => setForm({ ...form, classroom_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="">All classrooms</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Valid From (leave blank = now)</label>
              <input type="datetime-local" value={form.valid_from}
                onChange={e => setForm({ ...form, valid_from: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Expires (leave blank = no expiry)</label>
              <input type="datetime-local" value={form.valid_until}
                onChange={e => setForm({ ...form, valid_until: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
            Publish Notice
          </button>
        </form>
      )}

      <div className="space-y-3">
        {notices.map(n => {
          const pri = PRIORITY_LABELS[n.priority] || PRIORITY_LABELS[0]
          const expired = isExpired(n)
          return (
            <div key={n.id} className={`bg-white rounded-xl border p-5 ${expired || !n.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900">{n.title}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${pri.color}`}>{pri.label}</span>
                    {!n.is_active && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                    {expired && <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-500">Expired</span>}
                    {n.classroom_id && <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-700">Room #{n.classroom_id}</span>}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    From: {new Date(n.valid_from).toLocaleString()}
                    {n.valid_until && ` · Expires: ${new Date(n.valid_until).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {n.is_active && !expired && (
                    <button onClick={() => handleDeactivate(n.id)}
                      className="px-3 py-1.5 text-xs bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100">
                      Deactivate
                    </button>
                  )}
                  {['super_admin', 'hod', 'coordinator'].includes(user?.role) && (
                    <button onClick={() => handleDelete(n.id)}
                      className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {notices.length === 0 && (
          <div className="text-center py-12 text-gray-400">No notices yet</div>
        )}
      </div>
    </div>
  )
}
