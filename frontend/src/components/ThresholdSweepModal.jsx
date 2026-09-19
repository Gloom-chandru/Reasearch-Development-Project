import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, X } from 'lucide-react'

const API = '/api'

export default function ThresholdSweepModal({ classroom, onClose, onSuccess }) {
  const [videoActive, setVideoActive] = useState(false)
  const [frames, setFrames] = useState([]) // array of { image_data, true_student_id }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sweepResult, setSweepResult] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      setVideoActive(true)
    } catch (err) {
      setError(`Camera access error: ${err.message}. You can still run with enrolled frames if available.`)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setVideoActive(false)
  }

  const captureSingleFrame = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    ctx.drawImage(videoRef.current, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]

    setFrames(prev => [...prev, { image_data: base64, true_student_id: null }])
  }

  const autoCaptureBurst = async () => {
    setError('')
    for (let i = 0; i < 6; i++) {
      captureSingleFrame()
      await new Promise(r => setTimeout(r, 400))
    }
  }

  const handleRunSweep = async () => {
    if (frames.length < 5) {
      setError('At least 5 validation frames are required to execute a threshold sweep.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API}/experiments/threshold-sweep`, {
        classroom_id: classroom.id,
        update_config: true,
        validation_frames: frames,
        candidate_thresholds: [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70],
      })
      setSweepResult(res.data)
      if (onSuccess) onSuccess(res.data.selected_threshold)
    } catch (err) {
      setError(err.response?.data?.detail || 'Threshold sweep failed. Please check frame quality.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Empirical Threshold Sweep</h3>
              <p className="text-xs text-gray-500">Calibrate {classroom.name} ({classroom.code}) for Equal-Error Rate</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Research Protocol Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Milestone 3 Protocol: Evidence-Based Selection</span>
            </div>
            <p>
              Operating threshold must be selected from validation frames by minimizing |FAR - FRR|.
              Every reported rate includes sample size ($n$) and 95% Wilson confidence intervals.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="font-semibold underline">dismiss</button>
            </div>
          )}

          {!sweepResult ? (
            <>
              {/* Camera Preview and Capture */}
              <div className="space-y-3">
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                  <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  {!videoActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-xs">
                      <Camera className="w-8 h-8 mb-2 opacity-50" />
                      <span>Camera inactive</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                    {frames.length} / 5+ frames captured
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={captureSingleFrame}
                    className="flex-1 py-2 px-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    Capture 1 Frame
                  </button>
                  <button
                    type="button"
                    onClick={autoCaptureBurst}
                    className="flex-1 py-2 px-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-700 hover:bg-indigo-100 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Auto-Capture 6 Frames
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleRunSweep}
                disabled={loading || frames.length < 5}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Computing FAR/FRR Curve & Minimizing |FAR - FRR|...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Execute Threshold Sweep ({frames.length} frames)
                  </>
                )}
              </button>
            </>
          ) : (
            /* Results View */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-900">Calibration Validated & Applied</h4>
                  <p className="text-xs text-emerald-700">
                    Classroom config updated with optimal operating threshold: <strong>{sweepResult.selected_threshold.toFixed(2)}</strong>
                  </p>
                </div>
              </div>

              {/* Metrics Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <div className="text-xs text-gray-500">Threshold</div>
                  <div className="text-lg font-bold text-gray-900 mt-0.5">{sweepResult.selected_threshold.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <div className="text-xs text-gray-500">FAR</div>
                  <div className="text-lg font-bold text-indigo-600 mt-0.5">
                    {sweepResult.results_summary?.far != null ? `${(sweepResult.results_summary.far * 100).toFixed(1)}%` : '0.0%'}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <div className="text-xs text-gray-500">FRR</div>
                  <div className="text-lg font-bold text-amber-600 mt-0.5">
                    {sweepResult.results_summary?.frr != null ? `${(sweepResult.results_summary.frr * 100).toFixed(1)}%` : '0.0%'}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <div className="text-xs text-gray-500">F1 Score</div>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5">
                    {sweepResult.results_summary?.f1 != null ? `${(sweepResult.results_summary.f1 * 100).toFixed(1)}%` : '100%'}
                  </div>
                </div>
              </div>

              {/* Sample size & CI note */}
              <div className="p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-xs flex items-center justify-between">
                <span>Sample Size: <strong>n = {sweepResult.n_frames}</strong> validation frames</span>
                {sweepResult.n_frames < 30 && (
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full font-medium">
                    preliminary (n &lt; 30)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
