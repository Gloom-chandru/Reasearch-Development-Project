/**
 * LiveRecognitionPage — Faculty webcam interface for real-time attendance.
 *
 * The faculty member selects a classroom and active session, then the webcam
 * stream is captured and sent to /ws/recognize/{classroomId} every N frames.
 * Results are displayed in real-time alongside pipeline diagnostics.
 *
 * This page is purely a capture/display frontend — all recognition logic
 * runs on the backend CameraPipeline.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'

const API = '/api'
const CAPTURE_INTERVAL_MS = 1500  // send a frame every 1.5 seconds

const DECISION_COLOR = {
  match: 'text-green-600',
  low_confidence: 'text-yellow-600',
  unknown: 'text-gray-500',
  no_model: 'text-red-500',
}

const STATUS_COLOR = {
  present: 'bg-green-100 text-green-800',
  late: 'bg-yellow-100 text-yellow-800',
  unknown: 'bg-gray-100 text-gray-600',
}

export default function LiveRecognitionPage() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  const [classrooms, setClassrooms] = useState([])
  const [sessions, setSessions] = useState([])
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [running, setRunning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [recentResults, setRecentResults] = useState([])
  const [frameCount, setFrameCount] = useState(0)
  const [lastLatency, setLastLatency] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    axios.get(`${API}/classrooms`)
      .then(r => setClassrooms(r.data.classrooms || []))
      .catch(() => setStatusMsg('Failed to load classrooms — is the backend running?'))
  }, [])

  useEffect(() => {
    if (!selectedClassroom) { setSessions([]); return }
    axios.get(`${API}/sessions?classroom_id=${selectedClassroom}&limit=20`)
      .then(r => setSessions((r.data.sessions || []).filter(s => s.status === 'active' || s.status === 'scheduled')))
      .catch(() => setStatusMsg('Failed to load sessions for this classroom'))
  }, [selectedClassroom])

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    } catch (err) {
      setCameraError(`Camera error: ${err.message}`)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const captureAndSend = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    if (!selectedClassroom || !selectedSession) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    ctx.drawImage(videoRef.current, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

    const formData = new FormData()
    formData.append('image_data', base64)
    formData.append('session_id', selectedSession)

    const t0 = performance.now()
    try {
      const res = await axios.post(
        `${API}/ws/recognize/${selectedClassroom}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      const elapsed = Math.round(performance.now() - t0)
      setLastLatency(elapsed)
      setFrameCount(n => n + 1)

      const results = res.data?.results || []
      drawOverlay(results)
      if (results.length > 0) {
        setRecentResults(prev => {
          const newEntries = results.map(r => ({
            key: Date.now() + Math.random(),
            ts: new Date().toLocaleTimeString(),
            faces: results.length,
            identity: r.identity || {},
            quality: r.quality || {},
            liveness: r.liveness || {},
            attendance: r.attendance_record,
            rejected: r.rejected,
            reject_reason: r.reject_reason,
            latency: r.latency?.total_ms,
          }))
          return [...newEntries, ...prev].slice(0, 20)
        })
      }
      setStatusMsg(`Frame ${frameCount + 1} — ${results.length} face(s) — ${elapsed}ms round-trip`)
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail) ? (detail[0]?.msg || 'Validation error') : (typeof detail === 'string' ? detail : (err.message || 'Error'))
      setStatusMsg(`Frame error: ${msg}`)
    }
  }, [selectedClassroom, selectedSession, frameCount])

  const drawOverlay = (results) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const dw = video.offsetWidth || 640
    const dh = video.offsetHeight || 480
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw
      canvas.height = dh
    }
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dw, dh)

    if (!results || results.length === 0) return

    results.forEach(r => {
      const box = r.quality?.face_box || r.recognition?.face_box
      if (!box) return
      const [x, y, w, h] = box
      const scaleX = dw / (video.videoWidth || dw)
      const scaleY = dh / (video.videoHeight || dh)
      const bx = x * scaleX, by = y * scaleY, bw = w * scaleX, bh = h * scaleY

      const isMatch = r.identity?.decision === 'match'
      const isLow = r.identity?.decision === 'low_confidence'
      const color = r.rejected ? '#ef4444' : isMatch ? '#22c55e' : isLow ? '#eab308' : '#3b82f6'

      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.strokeRect(bx, by, bw, bh)

      const label = r.rejected ? `❌ ${r.reject_reason || 'Rejected'}` : isMatch ? `✓ Student #${r.identity?.student_id}` : isLow ? `⚠ Low confidence` : '? Unknown'
      ctx.fillStyle = color
      ctx.fillRect(bx, Math.max(0, by - 22), ctx.measureText(label).width + 12, 20)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 11px system-ui'
      ctx.fillText(label, bx + 6, Math.max(14, by - 8))
    })
  }

  const handleStart = async () => {
    if (!selectedClassroom || !selectedSession) {
      setStatusMsg('Select a classroom and session first')
      return
    }
    await startCamera()
    setRunning(true)
    setFrameCount(0)
    setRecentResults([])
    intervalRef.current = setInterval(captureAndSend, CAPTURE_INTERVAL_MS)
  }

  const handleStop = () => {
    clearInterval(intervalRef.current)
    stopCamera()
    setRunning(false)
    setStatusMsg('Stopped.')
  }

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      stopCamera()
    }
  }, [])

  // Re-schedule interval when captureAndSend changes (dep on selectedSession)
  useEffect(() => {
    if (!running) return
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(captureAndSend, CAPTURE_INTERVAL_MS)
  }, [captureAndSend, running])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Live Recognition</h2>

      {/* Config row */}
      <div className="bg-white rounded-xl border p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Classroom</label>
            <select value={selectedClassroom} onChange={e => { setSelectedClassroom(e.target.value); setSelectedSession('') }}
              className="w-full px-3 py-2 border rounded-lg text-sm" disabled={running}>
              <option value="">Select classroom…</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Session</label>
            <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" disabled={running}>
              <option value="">Select session…</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} [{s.status}]
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {!running ? (
              <button onClick={handleStart}
                disabled={!selectedClassroom || !selectedSession}
                className="w-full py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50">
                ▶ Start Recognition
              </button>
            ) : (
              <button onClick={handleStop}
                className="w-full py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700">
                ■ Stop
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
          <span>{statusMsg || 'Ready — select classroom and session, then start.'}</span>
          <span className="flex gap-3">
            {frameCount > 0 && <span>Frames: {frameCount}</span>}
            {lastLatency && <span>Last: {lastLatency}ms round-trip</span>}
            <span className={`font-medium ${running ? 'text-green-600' : 'text-gray-400'}`}>
              {running ? '● Recording' : '○ Stopped'}
            </span>
          </span>
        </div>
      </div>

      {cameraError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {cameraError}
        </div>
      )}

      {/* Video + results side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera feed */}
        <div className="bg-black rounded-xl overflow-hidden aspect-video relative">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }} />
          {!running && (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
              Camera feed appears here when running
            </div>
          )}
          {running && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              LIVE
            </div>
          )}
        </div>

        {/* Detection results */}
        <div className="bg-white rounded-xl border overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Detection Results</span>
            {recentResults.length > 0 && (
              <button onClick={() => setRecentResults([])}
                className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-80">
            {recentResults.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                Results appear here
              </div>
            ) : (
              <div className="divide-y">
                {recentResults.map(r => (
                  <div key={r.key} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{r.ts}</span>
                      {r.latency && <span className="text-xs text-gray-400 font-mono">{r.latency}ms</span>}
                    </div>
                    {r.rejected ? (
                      <p className="text-red-600 text-xs">✗ {r.reject_reason}</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${DECISION_COLOR[r.identity?.decision] || 'text-gray-700'}`}>
                            {r.identity?.decision === 'match'
                              ? `✓ Student #${r.identity.student_id}`
                              : r.identity?.decision === 'low_confidence'
                              ? `⚠ Low confidence (#${r.identity.student_id})`
                              : '? Unknown'}
                          </span>
                          {r.identity?.similarity != null && (
                            <span className="font-mono text-xs text-gray-500">
                              sim: {r.identity.similarity.toFixed(3)}
                            </span>
                          )}
                        </div>
                        {r.attendance && (
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${STATUS_COLOR[r.attendance.status] || 'bg-gray-100'}`}>
                            ✓ {r.attendance.student_name} — {r.attendance.status}
                          </span>
                        )}
                        <div className="flex gap-3 text-xs text-gray-400">
                          <span>Quality: {r.quality?.label || '—'}</span>
                          {r.liveness?.liveness && r.liveness.liveness !== 'not_checked' && (
                            <span>Liveness: {r.liveness.liveness}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explainability note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <p className="font-medium mb-1">Explainability — §7.12</p>
        <p>
          Similarity scores are cosine distances between 512-d InsightFace embeddings
          — not calibrated probabilities.  Do not display them as "AI confidence = X%".
          Rejections show the specific reason (quality / entry zone / liveness / low similarity).
          The operating threshold is configured in <code>RECOGNITION_THRESHOLD</code> and
          should be evidence-selected via the threshold sweep (see Analytics page).
        </p>
      </div>
    </div>
  )
}
