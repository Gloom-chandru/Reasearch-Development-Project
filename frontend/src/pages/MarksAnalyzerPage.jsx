import React, { useState } from 'react'
import {
  Sparkles,
  ExternalLink,
  RefreshCw,
  Maximize2,
  TrendingUp,
  ShieldCheck,
  GraduationCap
} from 'lucide-react'

const MARKS_ANALYZER_URL = 'https://student-marks-ai-analyzer.onrender.com/'

export default function MarksAnalyzerPage() {
  const [iframeKey, setIframeKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleRefresh = () => {
    setLoading(true)
    setIframeKey((prev) => prev + 1)
  }

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
  }

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900/90 p-4 flex flex-col' : ''}`}>
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Marks Analyzer
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI Online
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Academic performance insights, score distributions & automated student analytics
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleRefresh}
            title="Reload Marks Analyzer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Reload</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand View'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Expand'}</span>
          </button>

          <a
            href={MARKS_ANALYZER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs shadow-blue-500/20"
          >
            <span>Open in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embedded Application Frame */}
      <div className={`relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden ${isFullscreen ? 'flex-1' : 'h-[calc(100vh-210px)] min-h-[600px]'}`}>
        {loading && (
          <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-xs z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
            <p className="text-sm font-bold text-slate-800">Connecting to Marks Analyzer...</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Loading external student academic intelligence dashboard powered by AI.
            </p>
            <a
              href={MARKS_ANALYZER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
            >
              <span>Click here if the page takes too long to load</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={MARKS_ANALYZER_URL}
          title="Student Marks AI Analyzer"
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
        />
      </div>
    </div>
  )
}
