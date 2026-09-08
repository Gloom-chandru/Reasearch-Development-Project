import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import * as faceapi from 'face-api.js'

const API          = '/api'
const MIN_SAMPLES  = 5
const MAX_SAMPLES  = 10
const GREEN_HOLD_MS = 1200   // ms face must stay GREEN before auto-capture fires
const COOLDOWN_MS   = 2500   // ms between consecutive captures
const MODELS_PATH   = '/models'

// ── Error boundary ─────────────────────────────────────────────────────────
class EnrollmentBoundary extends React.Component {
  state = { crashed: false, msg: '' }
  static getDerivedStateFromError(e) { return { crashed: true, msg: e?.message || 'Unknown' } }
  componentDidCatch(e) { console.error('Enrollment:', e) }
  render() {
    if (this.state.crashed) return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <p className="text-4xl">⚠️</p>
          <h3 className="font-bold text-red-700">Enrollment error</h3>
          <p className="text-sm text-gray-600">{this.state.msg}</p>
          <button onClick={() => { this.setState({ crashed: false }); this.props.onClose() }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm">Close</button>
        </div>
      </div>
    )
    return this.props.children
  }
}

// ── Students page ──────────────────────────────────────────────────────────
export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [target, setTarget]     = useState(null)
  const [form, setForm] = useState({ register_number:'', full_name:'', department:'', section:'', email:'' })
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter]   = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    try { const r = await axios.get(`${API}/students?limit=500`); setStudents(r.data.students||[]) }
    catch {} finally { setLoading(false) }
  }

  const submit = async e => {
    e.preventDefault(); setError('')
    try {
      await axios.post(`${API}/students`, form)
      setShowForm(false)
      setForm({ register_number:'', full_name:'', department:'', section:'', email:'' })
      setSuccess('Student registered'); load()
      setTimeout(()=>setSuccess(''), 3000)
    } catch (err) { setError(err.response?.data?.detail||'Failed') }
  }

  const downloadReport = id => {
    const token = localStorage.getItem('token')
    const a = document.createElement('a')
    a.href = `${API}/reports/student/${id}?token=${token}`
    a.download = `student_${id}_report.xlsx`; a.click()
  }

  const filtered = filter
    ? students.filter(s =>
        s.full_name.toLowerCase().includes(filter.toLowerCase()) ||
        s.register_number.toLowerCase().includes(filter.toLowerCase()) ||
        s.department.toLowerCase().includes(filter.toLowerCase()))
    : students

  if (loading) return <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mt-8" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Students ({students.length})</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      {showForm && (
        <form onSubmit={submit} className="bg-white p-6 rounded-xl border space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['Register Number','register_number'],['Full Name','full_name'],['Department','department'],['Section','section']].map(([ph,k])=>(
              <input key={k} required placeholder={ph} value={form[k]}
                onChange={e=>setForm({...form,[k]:e.target.value})}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"/>
            ))}
            <input placeholder="Email (optional)" type="email" value={form.email}
              onChange={e=>setForm({...form,email:e.target.value})}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"/>
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Register Student</button>
        </form>
      )}

      <input placeholder="Filter by name, reg number or department…" value={filter}
        onChange={e=>setFilter(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"/>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Reg No','Name','Dept / Sec','Enrolled','Actions'].map(h=>(
              <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(s=>(
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{s.register_number}</td>
                <td className="px-4 py-3">{s.full_name}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{s.department} / {s.section}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    s.enrollment_count>=MIN_SAMPLES ? 'bg-green-100 text-green-700' :
                    s.enrollment_count>0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {s.enrollment_count}/{MIN_SAMPLES}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>setTarget(s)}
                      className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">📷 Enroll Face</button>
                    <button onClick={()=>downloadReport(s.id)}
                      className="px-3 py-1.5 text-xs bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100">⬇ Report</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No students found</td></tr>)}
          </tbody>
        </table>
      </div>

      {target && (
        <EnrollmentBoundary onClose={()=>{setTarget(null);load()}}>
          <EnrollmentModal student={target} onClose={()=>{setTarget(null);load()}}/>
        </EnrollmentBoundary>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ENROLLMENT MODAL — face-api.js browser-side detection
//
//  Architecture:
//    face-api.js (TinyFaceDetector + 68-landmark model) runs in the browser
//    on every animation frame. No backend round-trip for detection.
//    When quality is GOOD for GREEN_HOLD_MS, it auto-captures and sends
//    the JPEG to backend /enrollment/capture for embedding generation.
//
//  Quality criteria (all browser-side, instant):
//    ✓ Exactly one face detected
//    ✓ Face box > MIN_FACE_PX
//    ✓ Face is roughly centered in the oval guide
//    ✓ Detection score > 0.7
//
//  The backend is only called when saving — no quality-check endpoint needed.
// ═══════════════════════════════════════════════════════════════════════════

const MIN_FACE_PX   = 80    // minimum face box dimension in pixels

let modelsLoaded = false   // module-level cache — only load once

async function loadModels() {
  if (modelsLoaded) return
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
  ])
  modelsLoaded = true
}

function EnrollmentModal({ student, onClose }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)   // visible overlay
  const captureRef = useRef(null)   // hidden, for grabbing frames to send to backend
  const rafRef     = useRef(null)
  const doCaptureRef = useRef(null)   // ref to doCapture so detection loop always calls latest

  // Mutable refs (no re-render needed for these)
  const greenSince    = useRef(0)
  const lastCapture   = useRef(0)
  const isSaving      = useRef(false)
  const captureCount  = useRef(student.enrollment_count || 0)
  const mounted       = useRef(true)
  const lastDetection = useRef(null)   // latest face-api detection result

  // UI state (triggers re-render)
  const [ui, setUi] = useState({
    modelsReady:  false,
    cameraReady:  false,
    cameraError:  '',
    count:        student.enrollment_count || 0,
    samples:      [],
    statusColor:  'gray',  // gray | green | yellow | red
    statusMsg:    'Loading face models…',
    saving:       false,
  })

  const setStatus = (color, msg) =>
    setUi(prev => ({ ...prev, statusColor: color, statusMsg: msg }))

  // ── Load models + start camera ─────────────────────────────────────────
  useEffect(() => {
    mounted.current = true

    const init = async () => {
      try {
        setStatus('gray', 'Loading face detection models…')
        await loadModels()
        setUi(prev => ({ ...prev, modelsReady: true, statusMsg: 'Starting camera…' }))
        await startCamera()
      } catch (err) {
        setUi(prev => ({ ...prev, cameraError: 'Failed to load models: ' + err.message }))
      }
    }

    init()

    return () => {
      mounted.current = false
      cancelAnimationFrame(rafRef.current)
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
      if (!mounted.current) { stream.getTracks().forEach(t=>t.stop()); return }
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      if (mounted.current)
        setUi(prev => ({ ...prev, cameraError: `Camera unavailable: ${err.message}` }))
    }
  }

  const stopCamera = () => {
    const v = videoRef.current
    if (v?.srcObject) { v.srcObject.getTracks().forEach(t=>t.stop()); v.srcObject=null }
  }

  const onVideoReady = () => {
    setUi(prev => ({ ...prev, cameraReady: true, statusMsg: 'Position your face in the oval' }))
    startDetectionLoop()
  }

  // ── Detection loop (rAF) ────────────────────────────────────────────────
  const startDetectionLoop = () => {
    const detect = async () => {
      if (!mounted.current) return

      const video = videoRef.current
      if (video && video.readyState === 4) {
        try {
          const det = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
            .withFaceLandmarks()

          if (!mounted.current) return

          lastDetection.current = det || null
          drawOverlay(det)
          updateStatus(det)

          if (det) {
            const box   = det.detection.box
            const score = det.detection.score
            const isGoodSize = box.width >= MIN_FACE_PX && box.height >= MIN_FACE_PX
            const isGoodScore = score >= 0.7

            if (isGoodSize && isGoodScore) {
              if (!greenSince.current) greenSince.current = Date.now()
              const held     = Date.now() - greenSince.current
              const coolOk   = Date.now() - lastCapture.current >= COOLDOWN_MS
              const notDone  = captureCount.current < MAX_SAMPLES

              if (held >= GREEN_HOLD_MS && coolOk && !isSaving.current && notDone) {
                doCaptureRef.current && doCaptureRef.current()
              }
            } else {
              greenSince.current = 0
            }
          } else {
            greenSince.current = 0
          }
        } catch { /* detection error — keep looping */ }
      }

      rafRef.current = requestAnimationFrame(detect)
    }

    rafRef.current = requestAnimationFrame(detect)
  }

  const updateStatus = (det) => {
    if (!det) {
      setStatus('gray', '👤  No face detected — look directly at the camera')
      return
    }

    const box   = det.detection.box
    const score = det.detection.score
    const small = box.width < MIN_FACE_PX || box.height < MIN_FACE_PX
    const lowConf = score < 0.7

    if (small) {
      setStatus('yellow', '🟡  Move closer to the camera')
    } else if (lowConf) {
      setStatus('yellow', '🟡  Improve lighting — face the camera directly')
    } else {
      const held = greenSince.current ? Date.now() - greenSince.current : 0
      const pct  = Math.min(100, Math.round(held / GREEN_HOLD_MS * 100))
      setStatus('green', pct >= 100
        ? '🟢  Capturing…'
        : `🟢  Perfect! Hold still… ${pct}%`)
    }
  }

  // ── Canvas overlay drawing ──────────────────────────────────────────────
  const drawOverlay = (det) => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return

    const dw = video.offsetWidth
    const dh = video.offsetHeight
    if (!dw || !dh) return

    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width  = dw
      canvas.height = dh
    }

    const ctx  = canvas.getContext('2d')
    ctx.clearRect(0, 0, dw, dh)

    const cx = dw / 2
    const cy = dh / 2
    const rx = dw * 0.28
    const ry = dh * 0.42

    if (!det) {
      // Grey dashed guide oval — always visible when no face
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth   = 2
      ctx.setLineDash([10, 6])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle  = 'rgba(255,255,255,0.5)'
      ctx.font       = '14px system-ui'
      ctx.textAlign  = 'center'
      ctx.fillText('👤  Look at the camera', cx, cy + ry + 24)
      return
    }

    // ── Face detected — compute display box ────────────────────────────
    const box    = det.detection.box
    const score  = det.detection.score
    const scaleX = dw / (video.videoWidth  || dw)
    const scaleY = dh / (video.videoHeight || dh)

    // Mirror x for selfie view
    const mirroredX = (video.videoWidth || dw) - box.x - box.width
    const bx = mirroredX * scaleX
    const by = box.y     * scaleY
    const bw = box.width * scaleX
    const bh = box.height * scaleY

    const small    = box.width < MIN_FACE_PX || box.height < MIN_FACE_PX
    const lowConf  = score < 0.7
    const isGood   = !small && !lowConf

    const colour   = isGood ? '#22c55e' : small || lowConf ? '#eab308' : '#ef4444'
    const lineW    = isGood ? 4 : 3

    // Glow
    ctx.shadowColor = colour
    ctx.shadowBlur  = 22

    // Face bounding box
    ctx.strokeStyle = colour
    ctx.lineWidth   = lineW
    ctx.strokeRect(bx, by, bw, bh)
    ctx.shadowBlur  = 0

    // Corner brackets
    const L = 14, BW = lineW + 1
    const corners = [[bx,by,1,1],[bx+bw,by,-1,1],[bx,by+bh,1,-1],[bx+bw,by+bh,-1,-1]]
    ctx.strokeStyle = colour
    ctx.lineWidth   = BW
    corners.forEach(([tx,ty,sx,sy]) => {
      ctx.beginPath(); ctx.moveTo(tx+sx*L, ty); ctx.lineTo(tx, ty); ctx.lineTo(tx, ty+sy*L); ctx.stroke()
    })

    // Green progress arc (fills as green hold progresses)
    if (isGood && greenSince.current) {
      const pct  = Math.min(1, (Date.now() - greenSince.current) / GREEN_HOLD_MS)
      const bcx  = bx + bw / 2
      const bcy  = by + bh / 2
      const brad = Math.min(bw, bh) / 2 + 10
      ctx.beginPath()
      ctx.arc(bcx, bcy, brad, -Math.PI/2, -Math.PI/2 + pct * Math.PI * 2)
      ctx.strokeStyle = '#86efac'
      ctx.lineWidth   = 5
      ctx.stroke()
    }

    // Score badge
    const pctScore = Math.round(score * 100)
    ctx.fillStyle  = colour + 'cc'
    ctx.fillRect(bx, by - 22, 46, 18)
    ctx.fillStyle  = '#fff'
    ctx.font       = 'bold 11px system-ui'
    ctx.textAlign  = 'left'
    ctx.fillText(`${pctScore}%`, bx + 4, by - 8)

    // Draw 68 landmarks (tiny dots)
    if (det.landmarks) {
      ctx.fillStyle = colour + '99'
      det.landmarks.positions.forEach(pt => {
        const px = (video.videoWidth - pt.x) * scaleX   // mirror
        const py = pt.y * scaleY
        ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI*2); ctx.fill()
      })
    }
  }

  // ── Capture frame → backend ─────────────────────────────────────────────
  const grabBase64 = () => {
    const video  = videoRef.current
    const canvas = captureRef.current
    if (!video || !canvas) return null
    const w = video.videoWidth, h = video.videoHeight
    if (!w || !h) return null
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.save(); ctx.translate(w, 0); ctx.scale(-1, 1)   // mirror to match display
    ctx.drawImage(video, 0, 0, w, h)
    ctx.restore()
    return canvas.toDataURL('image/jpeg', 0.90).split(',')[1]
  }

  const doCapture = async () => {
    if (isSaving.current) return
    isSaving.current   = true
    greenSince.current = 0
    lastCapture.current = Date.now()

    const base64 = grabBase64()
    if (!base64) { isSaving.current = false; return }

    const idx = captureCount.current
    setUi(prev => ({ ...prev, saving: true, statusMsg: `📸 Saving sample ${idx+1}…`, statusColor: 'green' }))

    try {
      const fd = new FormData()
      fd.append('student_id', student.id)
      fd.append('image_data', base64)
      fd.append('capture_index', idx)

      const res  = await axios.post(`${API}/enrollment/capture`, fd)
      const data = res.data

      if (data.success) {
        const newCount = idx + 1
        captureCount.current = newCount
        setUi(prev => ({
          ...prev,
          saving:      false,
          count:       newCount,
          samples:     [...prev.samples, { index: idx, quality: data.quality?.label || 'GOOD' }],
          statusMsg:   `✅ Sample ${newCount} saved!${newCount < MIN_SAMPLES ? ` (${MIN_SAMPLES - newCount} more needed)` : ' 🎉 Minimum reached!'}`,
          statusColor: 'green',
        }))
      } else {
        setStatus('red', `❌ ${data.reason || 'Capture failed — try again'}`)
        setUi(prev => ({ ...prev, saving: false }))
      }
    } catch (err) {
      setStatus('red', `❌ ${err.response?.data?.detail || 'Server error'}`)
      setUi(prev => ({ ...prev, saving: false }))
    }

    setTimeout(() => {
      if (mounted.current) {
        isSaving.current = false
        if (captureCount.current < MAX_SAMPLES)
          setStatus('gray', 'Position your face in the oval')
      }
    }, 1200)
  }

  const manualCapture = () => { if (!isSaving.current) doCapture() }

  const isDone  = ui.count >= MAX_SAMPLES
  const isReady = ui.count >= MIN_SAMPLES

  const statusBg = {
    green:  'bg-green-900/90 text-green-100',
    yellow: 'bg-yellow-900/90 text-yellow-100',
    red:    'bg-red-900/90 text-red-100',
    gray:   'bg-black/65 text-white/80',
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900">{student.full_name}</h3>
            <p className="text-xs text-gray-500">{student.register_number} · Face Enrollment</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-sm font-bold">
            ✕
          </button>
        </div>

        {/* Camera */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>

          <video ref={videoRef} autoPlay muted playsInline
            onCanPlay={onVideoReady}
            style={{ transform: 'scaleX(-1)' }}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Overlay canvas */}
          <canvas ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          />

          {/* Hidden capture canvas */}
          <canvas ref={captureRef} className="hidden" />

          {/* Loading models spinner */}
          {(!ui.modelsReady || !ui.cameraReady) && !ui.cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-3 z-20">
              <div className="animate-spin h-10 w-10 border-b-2 border-white rounded-full" />
              <p className="text-sm">{ui.statusMsg}</p>
            </div>
          )}

          {/* Camera error */}
          {ui.cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 px-6 text-center z-20">
              <p className="text-4xl">📷</p>
              <p className="text-sm">{ui.cameraError}</p>
              <button onClick={startCamera} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Retry</button>
            </div>
          )}

          {/* Counter */}
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full z-20">
            {ui.count} / {MAX_SAMPLES}
          </div>

          {/* AUTO badge */}
          {ui.cameraReady && !isDone && (
            <div className="absolute top-2 right-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-20">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              AUTO
            </div>
          )}

          {/* Status bar */}
          {ui.cameraReady && (
            <div className={`absolute bottom-0 left-0 right-0 py-2 px-4 text-sm font-medium text-center z-20 transition-colors
              ${statusBg[ui.statusColor] || statusBg.gray}`}>
              {ui.statusMsg}
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="px-5 py-3 space-y-2 border-b">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span className={isReady ? 'text-green-600 font-medium' : ''}>
              {ui.count}/{MAX_SAMPLES}
              {isReady && !isDone && ' ✓ minimum reached'}
              {isDone && ' ✓ complete'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-500 ${
              isDone ? 'bg-green-500' : isReady ? 'bg-green-400' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, ui.count/MAX_SAMPLES*100)}%` }}/>
          </div>
          {ui.samples.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ui.samples.map((c,i) => (
                <div key={i} title={c.quality}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    c.quality==='GOOD' ? 'bg-green-100 text-green-700' :
                    c.quality==='ACCEPTABLE' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.index+1}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-center text-gray-400 pt-0.5">
            🟢 Green box = auto-captures · 🟡 Yellow = adjust position or lighting
          </p>
        </div>

        {/* Buttons */}
        <div className="px-5 py-3 flex gap-3">
          {!isDone ? (
            <button onClick={manualCapture}
              disabled={ui.saving || !ui.cameraReady || !!ui.cameraError}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium
                         hover:bg-blue-700 active:scale-95 transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed">
              {ui.saving ? '⏳ Saving…' : '📸 Capture Manually'}
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
      </div>
    </div>
  )
}
