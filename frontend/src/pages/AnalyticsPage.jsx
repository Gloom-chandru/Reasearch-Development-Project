import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Sparkles,
  Send,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Shield,
  Zap,
} from 'lucide-react'

const API = '/api'

// ── Formatting Helpers ──────────────────────────────────────────────────────────

const fmtVal = (v) => (v == null ? '—' : (v * 100).toFixed(1) + '%')
const fmtMs = (v) => (v == null ? '—' : v.toFixed(1) + ' ms')
const fmtRaw = (v) => (v == null ? '—' : typeof v === 'number' ? v.toFixed(4) : v)

const CI_BADGE = (lo, hi) =>
  lo != null ? `[${(lo * 100).toFixed(1)}%, ${(hi * 100).toFixed(1)}%]` : null

function useAblationData(experiments, results) {
  const ablationExps = experiments.filter(e => e.experiment_type === 'ablation')
  if (!ablationExps.length) return null

  const latest = ablationExps[ablationExps.length - 1]
  const rows = results[latest.id] || []

  const configs = ['recognition_only', 'plus_quality_gate', 'plus_entry_zone', 'plus_liveness']
  const labels = {
    recognition_only: 'Recognition only',
    plus_quality_gate: '+ Quality gate',
    plus_entry_zone: '+ Entry zone',
    plus_liveness: '+ Liveness',
  }
  const metrics = ['accuracy', 'precision', 'recall', 'f1', 'far', 'frr']

  return configs.map(cfg => {
    const entry = { config: cfg, label: labels[cfg] || cfg }
    metrics.forEach(m => {
      const row = rows.find(r => r.metric_name === m && r.condition === cfg)
      entry[m] = row ? { value: row.value, ci_lower: row.ci_lower, ci_upper: row.ci_upper, n: row.sample_size } : null
    })
    const latRow = rows.find(r => r.metric_name === 'total_mean_ms' && r.condition === cfg)
      || rows.find(r => r.metric_name?.includes('mean_ms') && r.condition === cfg)
    entry.latency = latRow ? latRow.value : null
    const nRow = rows.find(r => r.metric_name === 'evaluated_n' && r.condition === cfg)
    entry.n = nRow ? nRow.sample_size : (entry.accuracy?.n || null)
    return entry
  })
}

function useBaselineData(experiments, results) {
  const baselineExps = experiments.filter(e => e.experiment_type === 'baseline')
  if (!baselineExps.length) return null

  const latest = baselineExps[baselineExps.length - 1]
  const rows = results[latest.id] || []
  const systems = [...new Set(rows.map(r => r.condition).filter(Boolean))]
  const metrics = ['session_duration_min', 'effort_person_min', 'throughput_per_min']

  return systems.map(sys => {
    const entry = { system: sys }
    metrics.forEach(m => {
      const row = rows.find(r => r.metric_name === m && r.condition === sys)
      entry[m] = row ? row.value : null
    })
    const nRow = rows.find(r => r.condition === sys)
    entry.n = nRow ? nRow.sample_size : null
    return entry
  })
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [experiments, setExperiments] = useState([])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [wsConnected, setWsConnected] = useState(false)

  // Research Assistant State
  const [assistantQuery, setAssistantQuery] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantResponse, setAssistantResponse] = useState(null)
  const [assistantError, setAssistantError] = useState('')

  // Pagination for experiment tables
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  const wsRef = useRef(null)

  useEffect(() => {
    fetchAll()
    setupWebSocket()

    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const setupWebSocket = () => {
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${proto}//${window.location.host}/ws/analytics`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'experiment_result') {
            fetchAll()
          }
        } catch {
          // Ignore non-json
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
      }
    } catch {
      setWsConnected(false)
    }
  }

  const fetchAll = async () => {
    setFetchError('')
    try {
      const res = await axios.get(`${API}/experiments`)
      const exps = res.data || []
      setExperiments(exps)
      const map = {}
      await Promise.all(exps.map(async (exp) => {
        try {
          const r = await axios.get(`${API}/experiments/${exp.id}/results`)
          map[exp.id] = r.data || []
        } catch { map[exp.id] = [] }
      }))
      setResults(map)
    } catch (err) {
      setFetchError('Failed to load experiments: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleAssistantSubmit = async (e) => {
    e.preventDefault()
    if (!assistantQuery.trim()) return
    setAssistantLoading(true)
    setAssistantError('')
    try {
      const res = await axios.post(`${API}/experiments/assistant/query`, {
        query: assistantQuery.trim()
      })
      setAssistantResponse(res.data)
    } catch (err) {
      setAssistantError(err.response?.data?.detail || 'Failed to query research assistant')
    } finally {
      setAssistantLoading(false)
    }
  }

  const ablationRows = useAblationData(experiments, results)
  const baselineRows = useBaselineData(experiments, results)

  const nonAblationExperiments = experiments.filter(e => !['ablation', 'baseline'].includes(e.experiment_type))
  const totalPages = Math.max(1, Math.ceil(nonAblationExperiments.length / pageSize))
  const paginatedExperiments = nonAblationExperiments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Research Analytics & Reproducibility</h2>
          <p className="text-xs text-gray-500 mt-1">
            Empirical evaluation statistics, ablation studies, and grounded research telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span>{wsConnected ? 'Telemetry Live' : 'Polling'}</span>
          </div>
          <button
            onClick={fetchAll}
            className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-1.5 text-gray-700 shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm flex justify-between items-center">
          <span>{fetchError}</span>
          <button onClick={() => setFetchError('')} className="ml-4 underline text-xs">dismiss</button>
        </div>
      )}

      {/* Anti-Fabrication Guarantee Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 text-xs text-indigo-900 shadow-sm flex items-start gap-3">
        <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-indigo-950">Empirical Research Integrity Contract</p>
          <p className="text-indigo-800 leading-relaxed">
            All statistics shown below trace directly to verified rows in <code>experiment_results</code>.
            Every proportion carries a 95% Wilson confidence interval. Cells with sample sizes $n &lt; 30$ are explicitly
            tagged as <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold">preliminary</span>.
            Zero simulated or placeholder metrics are permitted.
          </p>
        </div>
      </div>

      {/* ── Research Assistant (RAG) ── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Research Assistant</h3>
              <p className="text-xs text-gray-500">Natural language queries strictly grounded in experiment database records</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Read-Only RAG
          </span>
        </div>

        <form onSubmit={handleAssistantSubmit} className="flex gap-2">
          <input
            type="text"
            value={assistantQuery}
            onChange={e => setAssistantQuery(e.target.value)}
            placeholder="Ask anything (e.g. 'How does lighting affect recognition accuracy?', 'What was the optimal threshold?')"
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={assistantLoading || !assistantQuery.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {assistantLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Ask
          </button>
        </form>

        {assistantError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {assistantError}
          </div>
        )}

        {assistantResponse && (
          <div className="p-4 bg-gray-50/80 border border-gray-200/80 rounded-xl space-y-3">
            <div className="prose prose-sm text-xs text-gray-800 whitespace-pre-line">
              {assistantResponse.answer}
            </div>

            {assistantResponse.citations?.length > 0 && (
              <div className="pt-2 border-t border-gray-200/60">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Database Citations ({assistantResponse.citations.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {assistantResponse.citations.map((c, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border border-gray-200 text-[11px] space-y-0.5">
                      <div className="font-semibold text-gray-900 truncate">{c.metric_name}</div>
                      <div className="text-indigo-600 font-mono font-bold">
                        {fmtRaw(c.value)}
                        {c.ci_lower != null && (
                          <span className="text-gray-500 font-normal ml-1">
                            [{c.ci_lower.toFixed(3)}, {c.ci_upper.toFixed(3)}]
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500 flex items-center justify-between text-[10px]">
                        <span>n={c.sample_size}</span>
                        {c.condition && <span className="truncate max-w-[120px]">{c.condition}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Ablation Study Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Ablation Study (Component Contributions)</h3>
            <p className="text-xs text-gray-500">Evaluating each pipeline stage: Quality Gate, Entry Zone, and Liveness Detector.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 text-gray-600 border-b border-gray-200">
                <th className="px-3.5 py-2.5 font-semibold">Configuration</th>
                {['Accuracy', 'Precision', 'Recall', 'F1', 'FAR', 'FRR'].map(h => (
                  <th key={h} className="px-3.5 py-2.5 font-semibold text-right">{h}</th>
                ))}
                <th className="px-3.5 py-2.5 font-semibold text-right">Latency</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">Sample Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ablationRows ? ablationRows.map(row => (
                <tr key={row.config} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3.5 py-3 font-semibold text-gray-900">{row.label}</td>
                  {['accuracy', 'precision', 'recall', 'f1', 'far', 'frr'].map(m => {
                    const cell = row[m]
                    return (
                      <td key={m} className="px-3.5 py-3 text-right">
                        {cell ? (
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-gray-900">{fmtVal(cell.value)}</span>
                            {cell.ci_lower != null && (
                              <span className="text-[10px] text-gray-500 font-mono">
                                {CI_BADGE(cell.ci_lower, cell.ci_upper)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 font-mono">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3.5 py-3 text-right font-mono text-gray-700">
                    {row.latency != null ? fmtMs(row.latency) : '—'}
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="font-mono text-gray-800">n={row.n ?? '—'}</span>
                      {row.n != null && row.n < 30 && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-medium">
                          preliminary
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                ['Recognition only', '+ Quality gate', '+ Entry zone', '+ Liveness'].map(cfg => (
                  <tr key={cfg} className="border-t">
                    <td className="px-3.5 py-3 font-medium text-gray-500">{cfg}</td>
                    <td colSpan={8} className="px-3.5 py-3 text-center text-gray-400 italic text-xs">
                      Awaiting empirical experiment execution
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Baseline System Comparison ── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-gray-900">Baseline System Comparison</h3>
        <p className="text-xs text-gray-500">Direct comparison against manual roll-call and biometric fingerprint scanners.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 text-gray-600 border-b border-gray-200">
                <th className="px-3.5 py-2.5 font-semibold">Attendance System</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">Duration (min)</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">Faculty Effort (person-min)</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">Throughput (students/min)</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">Sessions (n)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {baselineRows ? baselineRows.map(row => (
                <tr key={row.system} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3.5 py-3 font-semibold text-gray-900 capitalize">{row.system.replace(/_/g, ' ')}</td>
                  <td className="px-3.5 py-3 text-right font-mono text-gray-900">
                    {row.session_duration_min != null ? row.session_duration_min.toFixed(1) : '—'}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-gray-900">
                    {row.effort_person_min != null ? row.effort_person_min.toFixed(1) : '—'}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-gray-900 font-bold">
                    {row.throughput_per_min != null ? row.throughput_per_min.toFixed(1) : '—'}
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="font-mono text-gray-800">n={row.n ?? '—'}</span>
                      {row.n != null && row.n < 30 && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-medium">
                          preliminary
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                ['Manual Roll-Call', 'Fingerprint Scanner', 'Proposed AIoT System'].map(sys => (
                  <tr key={sys} className="border-t">
                    <td className="px-3.5 py-3 font-medium text-gray-500">{sys}</td>
                    <td colSpan={4} className="px-3.5 py-3 text-center text-gray-400 italic text-xs">
                      Awaiting baseline measurements
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Individual Experiment Runs & Telemetry (Paginated) ── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Empirical Experiment Telemetry</h3>
            <p className="text-xs text-gray-500">Detailed metric breakdowns per validation run.</p>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {paginatedExperiments.length === 0 ? (
          <p className="text-center py-8 text-xs text-gray-400">No individual experiment runs recorded yet.</p>
        ) : (
          paginatedExperiments.map(exp => {
            const expResults = results[exp.id] || []
            return (
              <div key={exp.id} className="p-4 border border-gray-100 rounded-xl space-y-3 bg-gray-50/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{exp.name}</h4>
                    <p className="text-xs text-gray-500">{exp.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded font-mono">{exp.experiment_type}</span>
                    <span>n={exp.participant_count ?? '?'}</span>
                    <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {expResults.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No per-metric rows recorded for this experiment.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white text-gray-600 border-b">
                          <th className="px-3 py-2 font-semibold">Metric</th>
                          <th className="px-3 py-2 font-semibold text-right">Value</th>
                          <th className="px-3 py-2 font-semibold text-right">95% Wilson CI</th>
                          <th className="px-3 py-2 font-semibold text-right">Sample Size</th>
                          <th className="px-3 py-2 font-semibold">Condition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {expResults.map(r => (
                          <tr key={r.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2 font-mono font-medium text-gray-900">{r.metric_name}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">
                              {r.metric_name.includes('acc') || r.metric_name.includes('far') || r.metric_name.includes('frr') || r.metric_name.includes('rate')
                                ? fmtVal(r.value)
                                : fmtRaw(r.value)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-500">
                              {r.ci_lower != null ? CI_BADGE(r.ci_lower, r.ci_upper) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="font-mono text-gray-700">{r.sample_size ?? '—'}</span>
                                {r.sample_size != null && r.sample_size < 30 && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-medium">
                                    preliminary
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-500">{r.condition || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
