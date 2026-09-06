import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const API = '/api'

const ROLE_LABELS = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
  hod: { label: 'HOD', color: 'bg-blue-100 text-blue-700' },
  coordinator: { label: 'Coordinator', color: 'bg-teal-100 text-teal-700' },
  faculty: { label: 'Faculty', color: 'bg-gray-100 text-gray-700' },
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'faculty' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canManage = me?.role === 'super_admin' || me?.role === 'hod'

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/auth/users`)
      setUsers(res.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const resetForm = () => {
    setForm({ username: '', email: '', full_name: '', password: '', role: 'faculty' })
    setEditUser(null)
    setError('')
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editUser) {
        // Update existing user
        const payload = {}
        if (form.email) payload.email = form.email
        if (form.full_name) payload.full_name = form.full_name
        if (form.password) payload.password = form.password
        await axios.put(`${API}/auth/users/${editUser.id}`, payload)
        setSuccess(`Updated ${editUser.username}`)
      } else {
        // Create new user
        await axios.post(`${API}/auth/users`, form)
        setSuccess(`Created user ${form.username}`)
      }
      resetForm()
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed')
    }
  }

  const handleDeactivate = async (u) => {
    if (!window.confirm(`Deactivate ${u.username}? They will no longer be able to log in.`)) return
    try {
      await axios.post(`${API}/auth/users/${u.id}/deactivate`)
      setSuccess(`${u.username} deactivated`)
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to deactivate')
    }
  }

  const handleReactivate = async (u) => {
    try {
      await axios.post(`${API}/auth/users/${u.id}/reactivate`)
      setSuccess(`${u.username} reactivated`)
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reactivate')
    }
  }

  if (loading) return <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mt-8 rounded-full"></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Users ({users.length})</h2>
        {canManage && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Add User
          </button>
        )}
      </div>

      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Create / Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border space-y-4">
          <h3 className="font-semibold text-gray-900">{editUser ? `Edit: ${editUser.username}` : 'Create User'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!editUser && (
              <input required placeholder="Username" value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            )}
            <input placeholder={editUser ? 'New email (optional)' : 'Email'} required={!editUser}
              type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Full Name" value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input placeholder={editUser ? 'New password (leave blank to keep)' : 'Password (min 8 chars)'}
              type="password" minLength={editUser ? 0 : 8} required={!editUser}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            {!editUser && (
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="faculty">Faculty</option>
                <option value="coordinator">Coordinator</option>
                <option value="hod">HOD</option>
                {me?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
              </select>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
              {editUser ? 'Update User' : 'Create User'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Username</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              {canManage && <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => {
              const roleInfo = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-gray-100 text-gray-700' }
              return (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditUser(u); setForm({ ...form, email: u.email, full_name: u.full_name, password: '' }); setShowForm(true) }}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                          Edit
                        </button>
                        {u.id !== me?.id && (
                          u.is_active
                            ? <button onClick={() => handleDeactivate(u)}
                                className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">
                                Deactivate
                              </button>
                            : <button onClick={() => handleReactivate(u)}
                                className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">
                                Reactivate
                              </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
