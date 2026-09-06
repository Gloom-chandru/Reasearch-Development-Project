import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'

const API = '/api'
const MIN_ENROLLMENTS = 5
const MAX_ENROLLMENTS = 10

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [enrollTarget, setEnrollTarget] = useState(null)
  const [form, setForm] = useState({ register_number: '', full_name: '', department: '', section: '', email: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API}/students?limit=500`)
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
      setSuccess('Student registered')
      fetchStudents()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create student')
    }
  }

  const downloadStudentReport = (studentId) => {
    const token = localStorage.getItem('token')
    const a = document.createElement('a')
    a.href = `${API}/reports/student/${studentId}?token=${token}`
    a.download = `student_${studentId}_attendance.xlsx`
    a.click()
  }

  const filtered = filter
    ? students.filter(s =>
        s.full_name.toLowerCase().includes(filter.toLowerCase()) ||
        s.register_number.toLowerCase().includes(filter.toLowerCase()) ||
        s.department.toLowerCase().includes(filter.toLowerCase())
      )
    : students

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mt-8"></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Students ({students.length})</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Register Number" value={form.register_number}
              onChange={e => setForm({ ...form, register_number: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input required placeholder="Full Name" value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input required placeholder="Department" value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input required placeholder="Section" value={form.section}
              onChange={e => setForm({ ...form, section: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Email (optional)" type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
            Register Student
          </button>
        </form>
      )}

      {/* Search */}
      <input placeholder="Filter by name, register number, or department…"
        value={filter} onChange={e => setFilter(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reg No</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Dept / Sec</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Enrolled</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-900 text-xs">{s.register_number}</td>
                <td className="px-4 py-3 text-gray-900">{s.full_name}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{s.department} / {s.section}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    s.enrollment_count >= MIN_ENROLLMENTS
                      ? 'bg-green-100 text-green-700'
                      : s.enrollment_count > 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {s.enrollment_count} / {MIN_ENROLLMENTS} samples
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                  <button onClick={() => setEnrollTarget(s)}
                    className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                    📷 Enroll Face
                  </button>
                  <button onClick={() => downloadStudentReport(s.id)}
                    className="px-3 py-1.5 text-xs bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100">
                    ⬇ Report
                  </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Webcam enrollment modal */}
      {enrollTarget && (
        <EnrollmentModal
          student={enrollTarget}
          onClose={() => { setEnrollTarget(null); fetchStudents() }}
        />
      )}
    </div>
  )
}

// ── Webcam enrollment modal ──────────────────────────────────────────────────

function EnrollmentModal({ student, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [captureIndex, setCaptureIndex] = useState(student.enrollment_count || 0)
  const [status, setStatus] = useState('idle') // idle | capturing | success | error
  const [message, setMessage] = useState('')
  const [captures, setCaptures] = useState([])
  const [cameraError, setCameraError] = useState('')

  // Start camera on mount
  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setCameraError(`Camera unavailable: ${err.message}`)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    const base64 = dataUrl.split(',')[1]

    setStatus('capturing')
    setMessage('Checking quality…')

    try {
      const formData = new FormData()
      formData.append('student_id', student.id)
      formData.append('image_data', base64)
      formData.append('capture_index', captureIndex)

      const res = await axios.post(`${API}/enrollment/capture`, formData)
      const data = res.data

      if (data.success) {
        const newIndex = captureIndex + 1
        setCaptureIndex(newIndex)
        setCaptures(prev => [...prev, { index: captureIndex, quality: data.quality?.label }])
        setStatus('success')
        setMessage(`✓ Capture ${captureIndex + 1} saved (${data.quality?.label})`)
      } else {
        setStatus('error')
        setMessage(`✗ ${data.reason}`)
      }
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.detail || 'Capture failed — server error')
    }

    setTimeout(() => setStatus('idle'), 1500)
  }, [student.id, captureIndex])

  const isDone = captureIndex >= MAX_ENROLLMENTS
  const isReady = captureIndex >= MIN_ENROLLMENTS

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-bold">Face Enrollment — {student.full_name}</h3>
            <p className="text-sm text-gray-500">{student.register_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium">Instructions for student:</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs">
              <li>Look directly at the camera, face well-lit</li>
              <li>Keep your head still during capture</li>
              <li>Capture {MIN_ENROLLMENTS}–{MAX_ENROLLMENTS} samples from slightly different angles</li>
              <li>Avoid glasses reflections and extreme shadows</li>
            </ul>
          </div>

          {/* Camera error */}
          {cameraError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {cameraError}
              <p className="mt-1 text-xs">Ensure camera permissions are granted in your browser.</p>
            </div>
          )}

          {/* Video feed */}
          {!cameraError && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} autoPlay muted playsInline
                className="w-full h-full object-cover" />
              {/* Overlay guide box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white/50 rounded-full w-48 h-60 opacity-40"></div>
              </div>
              {/* Status overlay */}
              {status !== 'idle' && (
                <div className={`absolute bottom-0 left-0 right-0 py-2 text-center text-sm font-medium ${
                  status === 'success' ? 'bg-green-900/80 text-green-300' :
                  status === 'error' ? 'bg-red-900/80 text-red-300' :
                  'bg-gray-900/80 text-gray-300'
                }`}>
                  {message}
                </div>
              )}
            </div>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className={`font-medium ${isReady ? 'text-green-700' : 'text-gray-700'}`}>
                {captureIndex} / {MAX_ENROLLMENTS} captures
                {isReady && !isDone && ' — minimum reached ✓'}
                {isDone && ' — complete ✓'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${isReady ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (captureIndex / MAX_ENROLLMENTS) * 100)}%` }}
              />
            </div>
            {/* Capture thumbnails */}
            {captures.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {captures.map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-mono ${
                    c.quality === 'GOOD' ? 'bg-green-100 text-green-700' :
                    c.quality === 'ACCEPTABLE' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`} title={c.quality}>
                    {c.index + 1}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={captureFrame}
              disabled={isDone || status === 'capturing' || !!cameraError}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'capturing' ? '⏳ Processing…' : isDone ? '✓ Enrollment Complete' : '📸 Capture'}
            </button>
            <button onClick={onClose}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
              {isReady ? 'Done' : 'Cancel'}
            </button>
          </div>

          {!isReady && (
            <p className="text-xs text-amber-600 text-center">
              ⚠ Minimum {MIN_ENROLLMENTS} samples required before this student can be recognised.
              Current: {captureIndex}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
