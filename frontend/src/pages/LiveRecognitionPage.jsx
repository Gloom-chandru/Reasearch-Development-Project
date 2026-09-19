/**
 * LiveRecognitionPage — Real-time face recognition attendance.
 *
 * Dual mode:
 *   • Desktop:  Admin panel with classroom/session selectors, video + results
 *   • Mobile:   Full-screen camera kiosk with attendance overlay
 *
 * The phone's browser camera captures frames and sends them to the backend
 * recognition pipeline. Results are displayed in real-time.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Play,
  Square,
  Wifi,
  WifiOff,
  Clock,
  Users,
  Monitor,
  Smartphone,
  ChevronDown,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Shield,
  Eye,
  RefreshCw,
} from 'lucide-react'

const API = '/api'
const CAPTURE_INTERVAL_MS = 1500

const STATUS_COLORS = {
  present: { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-400', flash: 'rgba(16,185,129,0.3)' },
  late:    { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-400', flash: 'rgba(245,158,11,0.3)' },
  unknown: { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-400', flash: 'rgba(239,68,68,0.3)' },
}

export default function LiveRecognitionPage() {
  // ── Camera & capture refs ────────────────────────────────────
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const wakeLockRef = useRef(null)

  // ── State ────────────────────────────────────────────────────
  const [classrooms, setClassrooms] = useState([])
  const [sessions, setSessions] = useState([])
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [running, setRunning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [facingMode, setFacingMode] = useState('environment') // 'user' | 'environment'
  const [isMobileMode, setIsMobileMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // ── Recognition state ────────────────────────────────────────
  const [recentResults, setRecentResults] = useState([])
  const [lastRecognition, setLastRecognition] = useState(null)
  const [frameCount, setFrameCount] = useState(0)
  const [lastLatency, setLastLatency] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [presentCount, setPresentCount] = useState(0)
  const [flashColor, setFlashColor] = useState(null)

  // ── Clock ────────────────────────────────────────────────────
  const [clock, setClock] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Auto-detect mobile ───────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobileMode(mq.matches)
    const handler = (e) => setIsMobileMode(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ── Load classrooms ──────────────────────────────────────────
  useEffect(() => {
    axios.get(`${API}/classrooms`)
      .then(r => setClassrooms(r.data.classrooms || []))
      .catch(() => setStatusMsg('Failed to load classrooms — is the backend running?'))
  }, [])

  // ── Load sessions for selected classroom ─────────────────────
  useEffect(() => {
    if (!selectedClassroom) { setSessions([]); return }
    axios.get(`${API}/sessions?classroom_id=${selectedClassroom}&limit=20`)
      .then(r => {
        const filtered = (r.data.sessions || []).filter(s => s.status === 'active' || s.status === 'scheduled')
        setSessions(filtered)
        // Auto-select if only one active session
        if (filtered.length === 1) setSelectedSession(String(filtered[0].id))
      })
      .catch(() => setStatusMsg('Failed to load sessions'))
  }, [selectedClassroom])

  // ── Screen Wake Lock ─────────────────────────────────────────
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch { /* not supported or denied */ }
  }

  const releaseWakeLock = () => {
    wakeLockRef.current?.release()
    wakeLockRef.current = null
  }

  // ── Camera controls ──────────────────────────────────────────
  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied — please allow camera access in your browser settings'
          : err.name === 'NotFoundError'
          ? 'No camera found — make sure a camera is connected'
          : `Camera error: ${err.message}`
      )
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const switchCamera = async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newMode)
    if (running) {
      stopCamera()
      // Small delay to allow tracks to fully stop
      await new Promise(r => setTimeout(r, 300))
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newMode, width: { ideal: 640 }, height: { ideal: 480 } },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      } catch (err) {
        setCameraError(`Camera switch error: ${err.message}`)
      }
    }
  }

  // ── LED Flash effect ─────────────────────────────────────────
  const triggerFlash = (status) => {
    const color = STATUS_COLORS[status] || STATUS_COLORS.unknown
    setFlashColor(color.flash)
    setTimeout(() => setFlashColor(null), 800)
  }

  // ── Sound feedback ───────────────────────────────────────────
  const playBeep = useCallback((status) => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = status === 'present' ? 880 : status === 'late' ? 660 : 440
      gain.gain.value = 0.1
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch { /* audio not available */ }
  }, [soundEnabled])

  // ── Capture & send frame ─────────────────────────────────────
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
        const newEntries = results.map(r => ({
          key: Date.now() + Math.random(),
          ts: new Date().toLocaleTimeString(),
          identity: r.identity || {},
          quality: r.quality || {},
          liveness: r.liveness || {},
          attendance: r.attendance_record,
          rejected: r.rejected,
          reject_reason: r.reject_reason,
          latency: r.latency?.total_ms,
        }))

        setRecentResults(prev => [...newEntries, ...prev].slice(0, 30))

        // Update last recognition for mobile overlay
        const matchResult = results.find(r => r.attendance_record && !r.rejected)
        if (matchResult) {
          setLastRecognition({
            name: matchResult.attendance_record.student_name || 'Unknown',
            status: matchResult.attendance_record.status || 'present',
            similarity: matchResult.identity?.similarity,
            time: new Date().toLocaleTimeString(),
          })
          setPresentCount(prev => prev + 1)
          triggerFlash(matchResult.attendance_record.status || 'present')
          playBeep(matchResult.attendance_record.status || 'present')
        } else if (results.some(r => r.rejected || r.identity?.decision === 'unknown')) {
          triggerFlash('unknown')
        }
      }
      setStatusMsg(`Frame ${frameCount + 1} — ${results.length} face(s) — ${elapsed}ms`)
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail) ? (detail[0]?.msg || 'Validation error') : (typeof detail === 'string' ? detail : (err.message || 'Error'))
      setStatusMsg(`Frame error: ${msg}`)
    }
  }, [selectedClassroom, selectedSession, frameCount, playBeep])

  // ── Draw face overlays ───────────────────────────────────────
  const drawOverlay = (results) => {
    const canvas = overlayCanvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const dw = video.offsetWidth || 640
    const dh = video.offsetHeight || 480
    canvas.width = dw
    canvas.height = dh
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

      // Draw rounded box
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.beginPath()
      const radius = 8
      ctx.moveTo(bx + radius, by)
      ctx.lineTo(bx + bw - radius, by)
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius)
      ctx.lineTo(bx + bw, by + bh - radius)
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh)
      ctx.lineTo(bx + radius, by + bh)
      ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius)
      ctx.lineTo(bx, by + radius)
      ctx.quadraticCurveTo(bx, by, bx + radius, by)
      ctx.stroke()

      // Label
      const label = r.rejected
        ? `✗ ${r.reject_reason || 'Rejected'}`
        : isMatch
        ? `✓ ${r.attendance_record?.student_name || `Student #${r.identity.student_id}`}`
        : isLow
        ? `⚠ Low confidence`
        : '? Unknown'

      ctx.font = 'bold 12px system-ui'
      const metrics = ctx.measureText(label)
      const labelW = metrics.width + 16
      const labelH = 24
      const labelX = bx
      const labelY = Math.max(0, by - labelH - 4)

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(labelX, labelY, labelW, labelH, 4)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, labelX + 8, labelY + 16)
    })
  }

  // ── Start / Stop ─────────────────────────────────────────────
  const handleStart = async () => {
    if (!selectedClassroom || !selectedSession) {
      setStatusMsg('Select a classroom and session first')
      return
    }
    await startCamera()
    await requestWakeLock()
    setRunning(true)
    setFrameCount(0)
    setRecentResults([])
    setPresentCount(0)
    setLastRecognition(null)
    intervalRef.current = setInterval(captureAndSend, CAPTURE_INTERVAL_MS)
  }

  const handleStop = () => {
    clearInterval(intervalRef.current)
    stopCamera()
    releaseWakeLock()
    setRunning(false)
    setStatusMsg('Stopped.')
  }

  // ── Fullscreen toggle ────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      stopCamera()
      releaseWakeLock()
    }
  }, [])

  // Re-schedule interval when captureAndSend changes
  useEffect(() => {
    if (!running) return
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(captureAndSend, CAPTURE_INTERVAL_MS)
  }, [captureAndSend, running])

  // Hidden canvas for frame capture
  const hiddenCanvas = <canvas ref={canvasRef} className="hidden" />

  // ────────────────────────────────────────────────────────────
  //  MOBILE KIOSK MODE
  // ────────────────────────────────────────────────────────────
  if (isMobileMode) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {hiddenCanvas}

        {/* LED Flash Overlay */}
        {flashColor && (
          <div
            className="fixed inset-0 z-[60] pointer-events-none transition-opacity duration-300"
            style={{ boxShadow: `inset 0 0 120px 40px ${flashColor}`, backgroundColor: flashColor }}
          />
        )}

        {/* Top Status Bar */}
        <div className="relative z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              {running ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-xs font-bold tracking-wider">LIVE</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                  <span className="text-gray-400 text-xs font-bold">READY</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white text-xs font-bold">{presentCount}</span>
              <span className="text-white/50 text-xs">Present</span>
            </div>
            <span className="text-white/70 text-xs font-mono">
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Camera Feed */}
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          />

          {/* Camera placeholder */}
          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90">
              <Camera className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/40 text-sm font-medium">Camera will start when you begin</p>
              {!selectedClassroom && (
                <p className="text-amber-400/70 text-xs mt-2">↓ Select classroom & session below</p>
              )}
            </div>
          )}

          {/* Scanning indicator */}
          {running && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
              <Eye className="w-4 h-4 text-blue-400 animate-pulse" />
              <span className="text-white/80 text-xs font-medium">Scanning faces...</span>
              {lastLatency && (
                <span className="text-white/40 text-xs font-mono">{lastLatency}ms</span>
              )}
            </div>
          )}
        </div>

        {/* Last Recognition Card */}
        {lastRecognition && (
          <div
            className={`mx-4 mb-2 rounded-2xl border-2 p-4 transition-all duration-500 ${
              lastRecognition.status === 'present'
                ? 'bg-emerald-950/80 border-emerald-500/50'
                : lastRecognition.status === 'late'
                ? 'bg-amber-950/80 border-amber-500/50'
                : 'bg-red-950/80 border-red-500/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                  lastRecognition.status === 'present'
                    ? 'bg-emerald-600'
                    : lastRecognition.status === 'late'
                    ? 'bg-amber-600'
                    : 'bg-red-600'
                }`}
              >
                {lastRecognition.status === 'present' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : lastRecognition.status === 'late' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base truncate">{lastRecognition.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-xs font-bold uppercase tracking-wide ${
                      STATUS_COLORS[lastRecognition.status]?.text || 'text-gray-400'
                    }`}
                  >
                    {lastRecognition.status}
                  </span>
                  <span className="text-white/30 text-xs">•</span>
                  <span className="text-white/50 text-xs">{lastRecognition.time}</span>
                  {lastRecognition.similarity != null && (
                    <>
                      <span className="text-white/30 text-xs">•</span>
                      <span className="text-white/40 text-xs font-mono">
                        {(lastRecognition.similarity * 100).toFixed(1)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Selector (when not running) */}
        {!running && (
          <div className="px-4 mb-2 space-y-2">
            <select
              value={selectedClassroom}
              onChange={(e) => { setSelectedClassroom(e.target.value); setSelectedSession('') }}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-medium"
            >
              <option value="" className="bg-gray-900">Select Classroom...</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id} className="bg-gray-900">{c.name} ({c.code})</option>
              ))}
            </select>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-medium"
            >
              <option value="" className="bg-gray-900">Select Session...</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id} className="bg-gray-900">{s.title} [{s.status}]</option>
              ))}
            </select>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="px-4 pb-4 pt-2 flex items-center justify-center gap-4">
          {!running ? (
            <button
              onClick={handleStart}
              disabled={!selectedClassroom || !selectedSession}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              <Play className="w-5 h-5" />
              Start Recognition
            </button>
          ) : (
            <>
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform"
              >
                <Square className="w-5 h-5" />
                Stop
              </button>
              <button
                onClick={switchCamera}
                className="w-14 h-14 flex items-center justify-center bg-white/10 border border-white/20 rounded-2xl text-white active:scale-95 transition-transform"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-14 h-14 flex items-center justify-center bg-white/10 border border-white/20 rounded-2xl text-white active:scale-95 transition-transform"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>

        {/* Camera Error */}
        {cameraError && (
          <div className="absolute top-20 left-4 right-4 bg-red-600/90 backdrop-blur-sm text-white p-4 rounded-2xl text-sm z-30">
            <p className="font-bold mb-1">Camera Error</p>
            <p className="text-red-100 text-xs">{cameraError}</p>
          </div>
        )}

        {/* VIT Branding */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/10 text-[10px] font-medium tracking-wide pointer-events-none whitespace-nowrap">
          Velammal Institute of Technology • AI & DS
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────
  //  DESKTOP MODE
  // ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {hiddenCanvas}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-600" />
            Live Recognition
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time face recognition attendance via camera
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <button
            onClick={() => setIsMobileMode(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Mobile Kiosk Mode
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Config Row */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Classroom</label>
            <select
              value={selectedClassroom}
              onChange={e => { setSelectedClassroom(e.target.value); setSelectedSession('') }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50/50 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
              disabled={running}
            >
              <option value="">Select classroom…</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Session</label>
            <select
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50/50 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
              disabled={running}
            >
              <option value="">Select session…</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.title} [{s.status}]</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Camera</label>
            <div className="flex items-center gap-2">
              <select
                value={facingMode}
                onChange={e => setFacingMode(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50/50 outline-none"
                disabled={running}
              >
                <option value="environment">Rear Camera</option>
                <option value="user">Front Camera</option>
              </select>
              {running && (
                <button
                  onClick={switchCamera}
                  className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  title="Switch camera"
                >
                  <SwitchCamera className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-end gap-2">
            {!running ? (
              <button
                onClick={handleStart}
                disabled={!selectedClassroom || !selectedSession}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            )}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-colors ${soundEnabled ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
              title={soundEnabled ? 'Sound on' : 'Sound off'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
          <span className="flex items-center gap-2">
            {statusMsg || 'Ready — select classroom and session, then start.'}
          </span>
          <span className="flex items-center gap-4">
            {frameCount > 0 && <span className="font-mono">Frames: {frameCount}</span>}
            {lastLatency && <span className="font-mono">Latency: {lastLatency}ms</span>}
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold">{presentCount} present</span>
            </span>
            <span className={`flex items-center gap-1.5 font-semibold ${running ? 'text-emerald-600' : 'text-gray-400'}`}>
              <span className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              {running ? 'Recording' : 'Stopped'}
            </span>
          </span>
        </div>
      </div>

      {/* Camera Error */}
      {cameraError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-semibold text-sm">Camera Error</p>
            <p className="text-red-600 text-xs mt-1">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Video + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Camera Feed — 3 columns */}
        <div className="lg:col-span-3 bg-black rounded-2xl overflow-hidden aspect-video relative shadow-lg">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          />

          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
              <Camera className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">Camera feed appears here when running</p>
            </div>
          )}

          {running && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full z-20">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
              <span className="text-white/50 mx-1">|</span>
              <span className="text-white/70 font-mono">
                {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}

          {/* Last Recognition Overlay */}
          {running && lastRecognition && (
            <div
              className={`absolute bottom-3 left-3 right-3 rounded-xl border p-3 backdrop-blur-sm z-20 transition-all duration-500 ${
                lastRecognition.status === 'present'
                  ? 'bg-emerald-900/70 border-emerald-500/50'
                  : lastRecognition.status === 'late'
                  ? 'bg-amber-900/70 border-amber-500/50'
                  : 'bg-red-900/70 border-red-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  lastRecognition.status === 'present' ? 'bg-emerald-500' : lastRecognition.status === 'late' ? 'bg-amber-500' : 'bg-red-500'
                }`}>
                  {lastRecognition.status === 'present' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <AlertTriangle className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{lastRecognition.name}</p>
                  <p className={`text-xs font-semibold uppercase ${STATUS_COLORS[lastRecognition.status]?.text || 'text-gray-400'}`}>
                    {lastRecognition.status}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detection Results — 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 overflow-hidden flex flex-col shadow-sm">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">Detection Results</span>
            <div className="flex items-center gap-2">
              {recentResults.length > 0 && (
                <button
                  onClick={() => setRecentResults([])}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                >
                  Clear
                </button>
              )}
              <span className="text-xs text-gray-400 font-mono">{recentResults.length}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[500px]">
            {recentResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Eye className="w-8 h-8 mb-2 text-gray-300" />
                <p className="text-sm font-medium">Results appear here</p>
                <p className="text-xs mt-1">Start recognition to see detections</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentResults.map(r => (
                  <div key={r.key} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-gray-400 font-medium">{r.ts}</span>
                      {r.latency && <span className="text-[11px] text-gray-400 font-mono">{r.latency}ms</span>}
                    </div>
                    {r.rejected ? (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <p className="text-red-600 text-xs font-semibold">{r.reject_reason}</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold text-sm flex items-center gap-1.5 ${
                            r.identity?.decision === 'match' ? 'text-emerald-700' :
                            r.identity?.decision === 'low_confidence' ? 'text-amber-700' : 'text-gray-600'
                          }`}>
                            {r.identity?.decision === 'match' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {r.identity?.decision === 'low_confidence' && <AlertTriangle className="w-3.5 h-3.5" />}
                            {r.identity?.decision === 'match'
                              ? r.attendance?.student_name || `Student #${r.identity.student_id}`
                              : r.identity?.decision === 'low_confidence'
                              ? `Low confidence (#${r.identity.student_id})`
                              : 'Unknown'}
                          </span>
                          {r.identity?.similarity != null && (
                            <span className="font-mono text-[11px] text-gray-400">
                              {(r.identity.similarity * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        {r.attendance && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full uppercase ${
                            r.attendance.status === 'present'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {r.attendance.status}
                          </span>
                        )}
                        <div className="flex gap-3 text-[11px] text-gray-400 font-medium">
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

      {/* Info Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 text-sm mb-1">Mobile Kiosk Mode</p>
            <p className="text-blue-700 text-xs leading-relaxed">
              Open this page on your phone browser (same WiFi) for a full-screen kiosk experience.
              Or use the standalone kiosk at <code className="bg-blue-100 px-1 rounded">/kiosk/{'<classroomId>'}</code>.
            </p>
          </div>
        </div>
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm mb-1">Explainability — §7.12</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Similarity scores are cosine distances between 512-d InsightFace embeddings — not calibrated probabilities.
              The operating threshold is configured in <code className="bg-amber-100 px-1 rounded">RECOGNITION_THRESHOLD</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Video icon for desktop header (not imported at top to keep mobile bundle clean)
function Video(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  )
}
