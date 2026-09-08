import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'

const API = '/api'
const MIN_ENROLLMENTS = 5
const MAX_ENROLLMENTS = 10

// How often to check face quality (ms) — lower = more responsive, higher = less CPU
const QUALITY_CHECK_INTERVAL_MS = 600

// How long the circle must stay GREEN before auto-capture fires (ms)
const GREEN_HOLD_MS = 800

// Minimum gap between two auto-captures (ms) — prevents duplicate captures
const CAPTURE_COOLDOWN_MS = 2500

// ── Error boundary ────────────────────────────────────────────────────────────
class EnrollmentErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMsg: '' }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || 'Unknown error' }
  }
  componentDidCatch(error, info) {
    console.error('EnrollmentModal crashed:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4">
            <p className="text-4xl">⚠️</p>
            <h3 className="text-lg font-bold text-red-700">Enrollment error</h3>
            <p className="text-sm text-gray-600">{this.state.errorMsg}</p>
            <button
              onClick={() => { this.setState({ hasError: false }); this.props.onClose() }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Students page ─────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const [students, setStudents]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [enrollTarget, setEnrollTarget] = useState(null)
  const [form, setForm] = useState({
    register_number: '', full_name: '', department: '', section: '', email: ''
  })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter]   = useState('')

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

  const downloadReport = (studentId) => {
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

  if (loading) return (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mt-8" />
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Students ({students.length})</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Add student form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Register Number', 'register_number', true],
              ['Full Name', 'full_name', true],
              ['Department', 'department', true],
              ['Section', 'section', true],
            ].map(([label, key, req]) => (
              <input key={key} required={req} placeholder={label} value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            ))}
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
              {['Reg No', 'Name', 'Dept / Sec', 'Enrolled', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
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
                    s.enrollment_count >= MIN_ENROLLMENTS ? 'bg-green-100 text-green-700' :
                    s.enrollment_count > 0 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
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
                    <button onClick={() => downloadReport(s.id)}
                      className="px-3 py-1.5 text-xs bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100">
                      ⬇ Report
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-400">No students found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {enrollTarget && (
        <EnrollmentErrorBoundary onClose={() => { setEnrollTarget(null); fetchStudents() }}>
          <EnrollmentModal
            student={enrollTarget}
            onClose={() => { setEnrollTarget(null); fetchStudents() }}
          />
        </EnrollmentErrorBoundary>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-CAPTURE ENROLLMENT MODAL
//
//  How it works:
//  1. Every QUALITY_CHECK_INTERVAL_MS ms, a frame is sent to /enrollment/quality-check
//  2. Backend returns face_found + quality_label (GOOD / ACCEPTABLE / REJECT)
//  3. An SVG overlay circle is drawn around the detected face:
//       GOOD       → green  circle  → auto-captures after GREEN_HOLD_MS ms
//       ACCEPTABLE → yellow circle  → shows hint to adjust
//       no face    → grey   circle
//       REJECT     → red    circle  + reason text
//  4. Auto-capture fires /enrollment/capture and saves the embedding
//  5. CAPTURE_COOLDOWN_MS prevents duplicate back-to-back captures
//  6. Manual "Capture" button is always available as fallback
// ─────────────────────────────────────────────────────────────────────────────

function EnrollmentModal({ student, onClose }) {
  const videoRef         = useRef(null)
  const canvasRef        = useRef(null)   // hidden, for capture
  const overlayCanvasRef = useRef(null)   // visible, drawn on top of video
  const streamRef        = useRef(null)
  const checkTimerRef    = useRef(null)
  const greenSinceRef    = useRef(null)   // timestamp when GOOD first appeared
  const lastCaptureRef   = useRef(0)      // timestamp of last capture
  const captureIndexRef  = useRef(student.enrollment_count || 0)
  const isCapturingRef   = useRef(false)  // prevent concurrent captures
  const isMountedRef     = useRef(true)

  const [captureCount, setCaptureCount]   = useState(student.enrollment_count || 0)
  const [captures, setCaptures]           = useState([])       // [{index, quality}]
  const [faceStatus, setFaceStatus]       = useState('loading') // loading|no_face|good|acceptable|reject|multi
  const [statusMsg, setStatusMsg]         = useState('Loading camera…')
  const [lastResult, setLastResult]       = useState(null)
  const [cameraError, setCameraError]     = useState('')
  const [videoReady, setVideoReady]       = useState(false)
  const [paused, setPaused]               = useState(false)    // true for 2s after capture
  const [manualCapturing, setManualCapturing] = useState(false)

  const isDone  = captureCount >= MAX_ENROLLMENTS
  const isReady = captureCount >= MIN_ENROLLMENTS

  // ── Camera setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true
    startCamera()
    return () => {
      isMountedRef.current = false
      clearTimeout(checkTimerRef.current)
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    setCameraError('')
    setFaceStatus('loading')
    setStatusMsg('Starting camera…')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      if (isMountedRef.current) {
        setCameraError(`Camera unavailable: ${err.message}`)
        setFaceStatus('error')
      }
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const handleVideoReady = () => {
    setVideoReady(true)
    setStatusMsg('Position your face in the circle')
    scheduleQualityCheck()
  }

  // ── Quality check loop ────────────────────────────────────────────────────
  const scheduleQualityCheck = useCallback(() => {
    clearTimeout(checkTimerRef.current)
    checkTimerRef.current = setTimeout(runQualityCheck, QUALITY_CHECK_INTERVAL_MS)
  }, [])

  const getFrameBase64 = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return null
    canvas.width  = vw
    canvas.height = vh
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, vw, vh)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    return dataUrl.split(',')[1] || null
  }

  const runQualityCheck = useCallback(async () => {
    if (!isMountedRef.current) return
    if (paused || isDone || isCapturingRef.current) {
      scheduleQualityCheck()
      return
    }

    const base64 = getFrameBase64()
    if (!base64) {
      scheduleQualityCheck()
      return
    }

    try {
      const formData = new FormData()
      formData.append('image_data', base64)
      const res    = await axios.post(`${API}/enrollment/quality-check`, formData)
      const data   = res.data

      if (!isMountedRef.current) return

      setLastResult(data)
      drawOverlay(data)

      if (!data.face_found) {
        setFaceStatus('no_face')
        setStatusMsg(data.quality_reason || 'No face detected — look at the camera')
        greenSinceRef.current = null
      } else if (data.face_count > 1) {
        setFaceStatus('multi')
        setStatusMsg('Multiple faces — only one person should be in frame')
        greenSinceRef.current = null
      } else if (data.quality_label === 'GOOD') {
        setFaceStatus('good')
        setStatusMsg('✓ Perfect — hold still…')
        // Start green hold timer
        if (!greenSinceRef.current) greenSinceRef.current = Date.now()
        const heldMs = Date.now() - greenSinceRef.current
        if (heldMs >= GREEN_HOLD_MS) {
          const cooldownOk = Date.now() - lastCaptureRef.current >= CAPTURE_COOLDOWN_MS
          if (cooldownOk && !isCapturingRef.current) {
            runAutoCapture(base64)
          }
        }
      } else if (data.quality_label === 'ACCEPTABLE') {
        setFaceStatus('acceptable')
        setStatusMsg('Move closer or improve lighting for best quality')
        greenSinceRef.current = null
      } else {
        setFaceStatus('reject')
        setStatusMsg(data.quality_reason || 'Adjust position or lighting')
        greenSinceRef.current = null
      }
    } catch {
      // network error — keep trying
    }

    scheduleQualityCheck()
  }, [paused, isDone, scheduleQualityCheck])

  // Re-start quality check loop whenever paused/isDone changes
  useEffect(() => {
    if (videoReady && !isDone) {
      scheduleQualityCheck()
    }
  }, [paused, isDone, videoReady, scheduleQualityCheck])

  // ── SVG overlay drawing ───────────────────────────────────────────────────
  const drawOverlay = useCallback((data) => {
    const overlay = overlayCanvasRef.current
    const video   = videoRef.current
    if (!overlay || !video) return

    const vw = video.clientWidth  || video.offsetWidth  || 640
    const vh = video.clientHeight || video.offsetHeight || 480
    overlay.width  = vw
    overlay.height = vh
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, vw, vh)

    // If face found, draw bounding box + ring
    if (data?.face_found && data.face_box) {
      const [fx, fy, fw, fh] = data.face_box
      // Scale from actual video resolution to displayed size
      const scaleX = vw / (video.videoWidth  || vw)
      const scaleY = vh / (video.videoHeight || vh)
      const dx = fx * scaleX
      const dy = fy * scaleY
      const dw = fw * scaleX
      const dh = fh * scaleY
      const cx = dx + dw / 2
      const cy = dy + dh / 2
      const rx = dw * 0.65
      const ry = dh * 0.75

      // Pick colour based on quality
      const colour =
        data.quality_label === 'GOOD'       ? '#22c55e' :  // green-500
        data.quality_label === 'ACCEPTABLE' ? '#eab308' :  // yellow-500
                                               '#ef4444'   // red-500

      // Glow effect
      ctx.shadowColor = colour
      ctx.shadowBlur  = 18

      // Ellipse ring
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.strokeStyle = colour
      ctx.lineWidth   = data.quality_label === 'GOOD' ? 4 : 3
      ctx.stroke()

      // Corner tick marks for GOOD
      if (data.quality_label === 'GOOD') {
        ctx.shadowBlur = 8
        const tickLen = 12
        const corners = [
          [dx, dy], [dx + dw, dy], [dx, dy + dh], [dx + dw, dy + dh],
        ]
        corners.forEach(([tx, ty]) => {
          const sx = tx < cx ? 1 : -1
          const sy = ty < cy ? 1 : -1
          ctx.beginPath()
          ctx.moveTo(tx + sx * tickLen, ty)
          ctx.lineTo(tx, ty)
          ctx.lineTo(tx, ty + sy * tickLen)
          ctx.strokeStyle = '#22c55e'
          ctx.lineWidth   = 3
          ctx.stroke()
        })
      }

      ctx.shadowBlur = 0

      // Confidence badge (top-right of face box)
      if (data.confidence != null) {
        const pct = Math.round(data.confidence * 100)
        ctx.fillStyle    = colour + 'cc'
        ctx.beginPath()
        ctx.roundRect(dx + dw - 42, dy - 22, 42, 20, 4)
        ctx.fill()
        ctx.fillStyle  = '#fff'
        ctx.font       = 'bold 11px system-ui'
        ctx.textAlign  = 'right'
        ctx.fillText(`${pct}%`, dx + dw - 4, dy - 7)
      }
    } else {
      // No face — draw grey guide oval in centre
      const cx = vw / 2, cy = vh / 2
      const rx = vw * 0.22, ry = vh * 0.38
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth   = 2
      ctx.setLineDash([8, 6])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [])

  // ── Auto-capture ──────────────────────────────────────────────────────────
  const runAutoCapture = useCallback(async (base64) => {
    if (isCapturingRef.current) return
    if (captureIndexRef.current >= MAX_ENROLLMENTS) return
    isCapturingRef.current = true
    lastCaptureRef.current  = Date.now()
    greenSinceRef.current   = null
    setPaused(true)

    const idx = captureIndexRef.current

    try {
      const formData = new FormData()
      formData.append('student_id', student.id)
      formData.append('image_data', base64)
      formData.append('capture_index', idx)

      const res  = await axios.post(`${API}/enrollment/capture`, formData)
      const data = res.data

      if (data.success) {
        const newIdx = idx + 1
        captureIndexRef.current = newIdx
        setCaptureCount(newIdx)
        setCaptures(prev => [...prev, { index: idx, quality: data.quality?.label || 'GOOD' }])
        setStatusMsg(`✓ Sample ${newIdx} captured!`)
        setFaceStatus('captured')
      } else {
        setStatusMsg(`✗ ${data.reason || 'Capture failed — try again'}`)
        setFaceStatus('reject')
      }
    } catch (err) {
      setStatusMsg(`✗ ${err.response?.data?.detail || 'Server error — try again'}`)
    }

    isCapturingRef.current = false
    // Resume after cooldown
    setTimeout(() => {
      if (isMountedRef.current) {
        setPaused(false)
        setFaceStatus('no_face')
        setStatusMsg('Position your face in the circle')
      }
    }, CAPTURE_COOLDOWN_MS)
  }, [student.id])

  // ── Manual capture fallback ───────────────────────────────────────────────
  const handleManualCapture = async () => {
    if (isCapturingRef.current || manualCapturing) return
    const base64 = getFrameBase64()
    if (!base64) return
    setManualCapturing(true)
    await runAutoCapture(base64)
    setManualCapturing(false)
  }

  // ── Status colours ────────────────────────────────────────────────────────
  const statusColors = {
    loading:    'bg-gray-100 text-gray-600',
    no_face:    'bg-gray-100 text-gray-600',
    good:       'bg-green-100 text-green-700',
    acceptable: 'bg-yellow-100 text-yellow-700',
    reject:     'bg-red-100 text-red-700',
    multi:      'bg-orange-100 text-orange-700',
    captured:   'bg-green-100 text-green-700',
    error:      'bg-red-100 text-red-700',
  }

  const statusIcons = {
    loading:    '⏳',
    no_face:    '👤',
    good:       '🟢',
    acceptable: '🟡',
    reject:     '🔴',
    multi:      '⚠️',
    captured:   '✅',
    error:      '❌',
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Face Enrollment — {student.full_name}
            </h3>
            <p className="text-xs text-gray-500">{student.register_number}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm">
            ✕
          </button>
        </div>

        {/* ── Camera area ── */}
        <div className="relative bg-gray-900" style={{ aspectRatio: '4/3' }}>

          {/* Video */}
          <video
            ref={videoRef}
            autoPlay muted playsInline
            onCanPlay={handleVideoReady}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* SVG overlay canvas — face box + quality ring */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Loading overlay */}
          {!videoReady && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-3">
              <div className="animate-spin h-10 w-10 border-b-2 border-white rounded-full"></div>
              <p className="text-sm">Starting camera…</p>
            </div>
          )}

          {/* Camera error */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 px-8 text-center">
              <p className="text-4xl">📷</p>
              <p className="text-sm font-medium">{cameraError}</p>
              <button onClick={startCamera}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                Retry Camera
              </button>
            </div>
          )}

          {/* Post-capture flash overlay */}
          {faceStatus === 'captured' && (
            <div className="absolute inset-0 bg-green-400/20 flex items-center justify-center pointer-events-none">
              <div className="bg-green-600/90 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-lg">
                ✓ Captured!
              </div>
            </div>
          )}

          {/* Counter badge top-left */}
          <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">
            {captureCount} / {MAX_ENROLLMENTS}
          </div>

          {/* Auto label top-right */}
          {videoReady && !isDone && (
            <div className="absolute top-3 right-3 bg-blue-600/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              AUTO
            </div>
          )}
        </div>

        {/* ── Status bar ── */}
        {videoReady && (
          <div className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium ${statusColors[faceStatus] || 'bg-gray-100 text-gray-600'}`}>
            <span className="text-base">{statusIcons[faceStatus] || '•'}</span>
            <span className="flex-1">{statusMsg}</span>
            {faceStatus === 'good' && greenSinceRef.current && (
              <span className="text-xs text-green-600 font-normal">hold still…</span>
            )}
          </div>
        )}

        {/* ── Progress + samples ── */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span className={isReady ? 'text-green-600 font-medium' : ''}>
              {captureCount} / {MAX_ENROLLMENTS}
              {isReady && !isDone && '  ✓ minimum reached'}
              {isDone && '  ✓ complete'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                isDone ? 'bg-green-500' : isReady ? 'bg-green-400' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, (captureCount / MAX_ENROLLMENTS) * 100)}%` }}
            />
          </div>

          {/* Sample chips */}
          {captures.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {captures.map((c, i) => (
                <div key={i} title={`Sample ${c.index + 1}: ${c.quality}`}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                    c.quality === 'GOOD'       ? 'bg-green-50  text-green-700  border-green-200' :
                    c.quality === 'ACCEPTABLE' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                 'bg-gray-50   text-gray-500   border-gray-200'
                  }`}>
                  {c.index + 1}
                </div>
              ))}
            </div>
          )}

          {/* Instruction hint */}
          {videoReady && !isDone && (
            <p className="text-xs text-gray-400 text-center">
              🟢 Green circle = auto-capture fires automatically · 🟡 Yellow = adjust position
            </p>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="px-6 pb-5 flex gap-3">
          {!isDone ? (
            <button
              onClick={handleManualCapture}
              disabled={manualCapturing || isCapturingRef.current || paused || !!cameraError || !videoReady}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm
                         hover:bg-blue-700 active:scale-95 transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {manualCapturing ? '⏳ Capturing…' : '📸 Capture Manually'}
            </button>
          ) : (
            <div className="flex-1 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm text-center font-medium">
              ✓ Enrollment Complete!
            </div>
          )}
          <button onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
            {isReady ? 'Done ✓' : 'Cancel'}
          </button>
        </div>

        {/* Warning if cancelled before minimum */}
        {!isReady && captureCount === 0 && (
          <p className="text-xs text-gray-400 text-center pb-4">
            Minimum {MIN_ENROLLMENTS} samples needed for reliable recognition
          </p>
        )}
      </div>
    </div>
  )
}
