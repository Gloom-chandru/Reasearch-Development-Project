import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  Radio,
  Video,
  Users,
  ExternalLink,
  Volume2,
  VolumeX
} from 'lucide-react'

const NotificationContext = createContext(null)

// Synthesize a pleasant high-tech chime using Web Audio API (no external MP3 asset needed!)
function playChime(type = 'info') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    // Frequencies tailored to notification mood
    if (type === 'success' || type === 'attendance') {
      osc1.frequency.setValueAtTime(523.25, now) // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1) // E5
      osc2.frequency.setValueAtTime(783.99, now + 0.08) // G5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.22) // C6
    } else if (type === 'warning') {
      osc1.frequency.setValueAtTime(440, now) // A4
      osc1.frequency.exponentialRampToValueAtTime(392, now + 0.15) // G4
    } else if (type === 'notice') {
      osc1.frequency.setValueAtTime(587.33, now) // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.14) // A5
    } else {
      osc1.frequency.setValueAtTime(440, now) // A4
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12) // E5
    }

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

    osc1.connect(gain)
    if (osc2) osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.45)
    if (osc2) {
      osc2.start(now + 0.08)
      osc2.stop(now + 0.45)
    }
  } catch {
    // AudioContext blocked or not supported — fail silently
  }
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const navigate = useNavigate()

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 400) // Match exit animation duration
  }, [])

  const notify = useCallback(
    ({
      title,
      message,
      type = 'info',
      category = 'SYSTEM UPDATE',
      duration = 5500,
      action = null,
      playSound = true
    }) => {
      const id = Date.now() + Math.random().toString(36).slice(2, 6)
      const newToast = {
        id,
        title,
        message,
        type,
        category,
        duration,
        action,
        createdAt: new Date(),
        isExiting: false
      }

      if (soundEnabled && playSound) {
        playChime(type)
      }

      setToasts((prev) => [newToast, ...prev.slice(0, 3)]) // Keep max 4 toasts stacked
      return id
    },
    [soundEnabled]
  )

  // Listen to custom global window event for cross-component triggers
  useEffect(() => {
    const handleCustomNotify = (e) => {
      if (e.detail) {
        notify(e.detail)
      }
    }
    window.addEventListener('smart-classroom-notify', handleCustomNotify)
    return () => window.removeEventListener('smart-classroom-notify', handleCustomNotify)
  }, [notify])

  return (
    <NotificationContext.Provider
      value={{
        notify,
        dismiss,
        toasts,
        soundEnabled,
        setSoundEnabled
      }}
    >
      {children}
      <NovelToastContainer
        toasts={toasts}
        onDismiss={dismiss}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((s) => !s)}
        navigate={navigate}
      />
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

/**
 * Toast Container positioned at the bottom-right with stacked card depth.
 */
function NovelToastContainer({ toasts, onDismiss, soundEnabled, onToggleSound, navigate }) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none max-w-sm w-full px-4 sm:px-0"
      role="region"
      aria-live="polite"
    >
      {toasts.map((toast, index) => (
        <NovelToastItem
          key={toast.id}
          toast={toast}
          index={index}
          onDismiss={() => onDismiss(toast.id)}
          navigate={navigate}
        />
      ))}
    </div>
  )
}

/**
 * Single Toast Item with elastic novelty motion, glowing rim, and progress bar.
 */
function NovelToastItem({ toast, index, onDismiss, navigate }) {
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef(null)
  const startTimeRef = useRef(Date.now())
  const remainingRef = useRef(toast.duration)

  useEffect(() => {
    if (toast.duration <= 0) return

    const startTimer = () => {
      startTimeRef.current = Date.now()
      timerRef.current = setTimeout(() => {
        onDismiss()
      }, remainingRef.current)
    }

    if (!isPaused) {
      startTimer()
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPaused, onDismiss, toast.duration])

  const handleMouseEnter = () => {
    setIsPaused(true)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      const elapsed = Date.now() - startTimeRef.current
      remainingRef.current = Math.max(0, remainingRef.current - elapsed)
    }
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
  }

  // Theme styling based on notification type
  const typeConfig = {
    attendance: {
      accent: 'from-emerald-500 via-teal-400 to-cyan-500',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      glow: 'rgba(16, 185, 129, 0.4)',
      icon: CheckCircle2,
      label: 'ATTENDANCE CONFIRMED'
    },
    success: {
      accent: 'from-teal-500 via-emerald-400 to-green-500',
      badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      iconBg: 'bg-teal-500/20 text-teal-400',
      glow: 'rgba(20, 184, 166, 0.4)',
      icon: CheckCircle2,
      label: 'SUCCESS'
    },
    notice: {
      accent: 'from-purple-500 via-indigo-400 to-pink-500',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      iconBg: 'bg-purple-500/20 text-purple-400',
      glow: 'rgba(168, 85, 247, 0.4)',
      icon: Radio,
      label: 'CAMPUS NOTICE'
    },
    warning: {
      accent: 'from-amber-500 via-orange-400 to-yellow-500',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      iconBg: 'bg-amber-500/20 text-amber-400',
      glow: 'rgba(245, 158, 11, 0.4)',
      icon: AlertTriangle,
      label: 'SYSTEM ALERT'
    },
    error: {
      accent: 'from-rose-500 via-red-400 to-pink-600',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      iconBg: 'bg-rose-500/20 text-rose-400',
      glow: 'rgba(244, 63, 94, 0.4)',
      icon: AlertTriangle,
      label: 'ERROR'
    },
    info: {
      accent: 'from-blue-500 via-indigo-400 to-cyan-500',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      iconBg: 'bg-blue-500/20 text-blue-400',
      glow: 'rgba(59, 130, 246, 0.4)',
      icon: Sparkles,
      label: 'LIVE UPDATE'
    }
  }

  const cfg = typeConfig[toast.type] || typeConfig.info
  const IconComponent = cfg.icon

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        '--glow-color': cfg.glow
      }}
      className={`pointer-events-auto w-full relative overflow-hidden rounded-2xl backdrop-blur-2xl bg-[#091b36]/95 border border-slate-700/70 text-white shadow-2xl p-4 transition-all duration-300 transform-gpu ${
        toast.isExiting ? 'novel-toast-exit' : 'novel-toast-enter novel-toast-glow'
      } hover:scale-[1.02] hover:-translate-y-0.5`}
    >
      {/* Radiant top gradient border rim */}
      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${cfg.accent}`} />

      <div className="flex items-start gap-3">
        {/* Animated Icon Avatar */}
        <div
          className={`w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0 shadow-xs mt-0.5 relative group`}
        >
          <IconComponent className="w-5 h-5 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${cfg.badgeBg}`}
            >
              {toast.category || cfg.label}
            </span>
            <span className="text-[10px] font-medium text-slate-400">Just now</span>
          </div>

          <h4 className="text-xs font-bold text-white leading-snug truncate">
            {toast.title}
          </h4>

          {toast.message && (
            <p className="text-[11px] text-slate-300 leading-normal mt-0.5 line-clamp-2">
              {toast.message}
            </p>
          )}

          {/* Action button if provided */}
          {toast.action && (
            <div className="mt-2.5">
              <button
                onClick={() => {
                  if (toast.action.onClick) toast.action.onClick()
                  if (toast.action.to) navigate(toast.action.to)
                  onDismiss()
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>{toast.action.label}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 -mr-1 -mt-1"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-dismiss countdown bar at the bottom */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/10 overflow-hidden">
          <div
            style={{
              animationDuration: `${toast.duration}ms`,
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
            className={`h-full bg-gradient-to-r ${cfg.accent} origin-left animate-progress`}
          />
        </div>
      )}
    </div>
  )
}
