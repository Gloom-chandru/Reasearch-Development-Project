import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api'

const ACTION_COLOR = {
  login: 'bg-blue-100 text-blue-700',
  create_user: 'bg-teal-100 text-teal-700',
  update_user: 'bg-yellow-100 text-yellow-700',
  deactivate_user: 'bg-red-100 text-red-700',
  reactivate_user: 'bg-green-100 text-green-700',
  correct_attendance: 'bg-purple-100 text-purple-700',
  activate: 'bg-green-100 text-green-700',
  complete: 'bg-gray-100 text-gray-700',
  create: 'bg-blue-50 text-blue-600',
  update: 'bg-yellow-50 text-yellow-600',
  delete: 'bg-red-50 text-red-600',
  enroll: 'bg-teal-50 text-teal-600',
  unenroll: 'bg-orange-50 text-orange-600',
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionTypes, setActionTypes] = useState([])
  const [filters, setFilters] = useState({ action: '', entity_type: '', skip: 0, limit: 50 })
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { fetchLogs(); fetchActions() }, [])

  const fetchActions = async () => {
    try {
      const res = await axios.get(`${API}/audit/actions`)
      setActionTypes(res.data || [])
    } catch { /* ignore */ }
  }

  const fetchLogs = async (overrides = {}) => {
    setLoading(true)
    const params = { ...filters, ...overrides }
    try {
      const res = await axios.get(`${API}/audit/logs`, { params })
      setLogs(res.data.logs || [])
      setTotal(res.data.total || 0)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const applyFilter = (key, value) => {
    const updated = { ...filters, [key]: value, skip: 0 }
    setFilters(updated)
    fetchLogs(updated)
  }

  const nextPage = () => {
    const newSkip = filters.skip + filters.limit
    if (newSkip >= total) return
    const updated = { ...filters, skip: newSkip }
    setFilters(updated)
    fetchLogs(updated)
  }

  const prevPage = () => {
    const newSkip = Math.max(0, filters.skip - filters.limit)
    const updated = { ...filters, skip: newSkip }
    setFilters(updated)
    fetchLogs(updated)
  }

  const page = Math.floor(filters.skip / filters.limit) + 1
  const totalPages = Math.ceil(total / filters.limit)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
      <p className="text-sm text-gray-500">
        All state-changing actions — logins, attendance corrections, user management, session lifecycle.
        Read-only. {total > 0 && <span className="font-medium">{total} total entries.</span>}
      </p>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
        <select value={filters.action} onChange={e => applyFilter('action', e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All actions</option>
          {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filters.entity_type} onChange={e => applyFilter('entity_type', e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All entity types</option>
          {['user', 'attendance_session', 'attendance_record', 'classroom', 'student'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button onClick={() => { setFilters({ action: '', entity_type: '', skip: 0, limit: 50 }); fetchLogs({ action: '', entity_type: '', skip: 0, limit: 50 }) }}
          className="px-3 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50">
          Clear filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Entity</th>
                  <th className="text-left px-4 py-3 font-medium">Details</th>
                  <th className="text-left px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {log.username || <span className="text-gray-400 italic">system</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ACTION_COLOR[log.action] || 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {log.entity_type}
                        {log.entity_id != null && <span className="text-gray-400"> #{log.entity_id}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                        {log.details || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                    {expandedId === log.id && log.details && (
                      <tr className="bg-blue-50">
                        <td colSpan="6" className="px-6 py-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">Full details</p>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all">{log.details}</pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-400">No audit log entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > filters.limit && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
            <span>Page {page} of {totalPages} ({total} total)</span>
            <div className="flex gap-2">
              <button onClick={prevPage} disabled={filters.skip === 0}
                className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                ← Prev
              </button>
              <button onClick={nextPage} disabled={filters.skip + filters.limit >= total}
                className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
