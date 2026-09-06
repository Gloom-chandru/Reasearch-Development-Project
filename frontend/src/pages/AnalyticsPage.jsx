import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api'

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtVal = (v) => (v == null ? '—' : (v * 100).toFixed(1) + '%')
const fmtMs = (v) => (v == null ? '—' : v.toFixed(1) + ' ms')
const fmtRaw = (v) => (v == null ? '—' : typeof v === 'number' ? v.toFixed(4) : v)

const CI_BADGE = (lo, hi) =>
  lo != null ? `[${(lo * 100).toFixed(1)}%, ${(hi * 100).toFixed(1)}%]` : '—'

/**
 * Pull the best (most recent) ablation experiment results from the DB and
 * organise them by condition (e.g. "recognition_only", "plus_quality_gate", etc.)
 */
function useAblationData(experiments, results) {
  const ablationExps = experiments.filter(e => e.experiment_type === 'ablation')
  if (!ablationExps.length) return null

  // Use the most recent ablation experiment
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
      || rows.find(r => r.metric_name.includes('mean_ms') && r.condition === cfg)
    entry.latency = latRow ? latRow.value : null
    const nRow = rows.find(r => r.metric_name === 'evaluated_n' && r.condition === cfg)
    entry.n = nRow ? nRow.sample_size : (entry.accuracy?.n || null)
    return entry
  })
}

/**
 * Pull baseline comparison data from the most recent baseline experiment.
 */
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

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [experiments, setExperiments] = useState([])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => { fetchAll() }, [])

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
    }
    finally { setLoading(false) }
  }

  const ablationRows = useAblationData(experiments, results)
  const baselineRows = useBaselineData(experiments, results)

  // Group non-ablation, non-baseline experiments by type
  const grouped = {}
  for (const exp of experiments.filter(e => !['ablation', 'baseline'].includes(e.experiment_type))) {
    if (!grouped[exp.experiment_type]) grouped[exp.experiment_type] = []
    grouped[exp.experiment_type].push(exp)
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
    </div>
  )

  const renderResults = (expId) => {
    const rows = results[expId]
    if (!rows || rows.length === 0) {
      return <p className="text-gray-400 text-sm italic py-2">Awaiting experiment data</p>
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-3 py-2 font-medium">Metric</th>
              <th className="px-3 py-2 font-medium text-right">Value</th>
              <th className="px-3 py-2 font-medium text-right">95% CI</th>
              <th className="px-3 py-2 font-medium text-right">n</th>
              <th className="px-3 py-2 font-medium">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-1.5 font-mono text-gray-800">{r.metric_name}</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtRaw(r.value)}</td>
                <td className="px-3 py-1.5 text-right text-gray-500">
                  {r.ci_lower != null ? `[${fmtRaw(r.ci_lower)}, ${fmtRaw(r.ci_upper)}]` : '—'}
                </td>
                <td className="px-3 py-1.5 text-right">{r.sample_size ?? '—'}</td>
                <td className="px-3 py-1.5 text-gray-500">{r.condition || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Research Analytics</h2>
        <button onClick={fetchAll} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">
          ↻ Refresh
        </button>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex justify-between items-center">
          <span>{fetchError}</span>
          <button onClick={() => setFetchError('')} className="ml-4 underline text-xs">dismiss</button>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium">Anti-fabrication contract</p>
        <p className="mt-1 text-xs">All numbers below trace to rows in <code>experiment_results</code>.
        Every proportion carries a 95% Wilson CI. Tables show "Awaiting experiment data" until
        real data is present — no placeholder values.</p>
      </div>

      {/* Per-type experiment results */}
      {Object.keys(grouped).length === 0 && experiments.filter(e => !['ablation', 'baseline'].includes(e.experiment_type)).length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          No experiments have been run yet. Results appear here once experiments are executed via the API.
        </div>
      ) : (
        Object.entries(grouped).map(([type, exps]) => (
          <div key={type} className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 capitalize mb-4">
              {type.replace(/_/g, ' ')} Experiments
            </h3>
            {exps.map(exp => (
              <div key={exp.id} className="mb-5 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-gray-700">{exp.name}</p>
                  <span className="text-xs text-gray-400">
                    n={exp.participant_count ?? '?'} · {new Date(exp.created_at).toLocaleDateString()}
                  </span>
                </div>
                {renderResults(exp.id)}
              </div>
            ))}
          </div>
        ))
      )}

      {/* ── Ablation Study ── */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Ablation Study</h3>
        <p className="text-xs text-gray-500 mb-4">
          Component contribution — each row adds one pipeline stage.
          {!ablationRows && ' Run the ablation experiment to populate this table.'}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs">
              <tr>
                <th className="text-left px-3 py-2">Configuration</th>
                {['Accuracy', 'Precision', 'Recall', 'F1', 'FAR', 'FRR'].map(h => (
                  <th key={h} className="text-right px-3 py-2">{h}</th>
                ))}
                <th className="text-right px-3 py-2">Latency</th>
                <th className="text-right px-3 py-2">n</th>
              </tr>
            </thead>
            <tbody>
              {ablationRows ? ablationRows.map(row => (
                <tr key={row.config} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  {['accuracy', 'precision', 'recall', 'f1', 'far', 'frr'].map(m => (
                    <td key={m} className="px-3 py-2 text-right font-mono text-xs">
                      {row[m]
                        ? <span title={`95% CI: ${CI_BADGE(row[m].ci_lower, row[m].ci_upper)}`}>
                            {fmtVal(row[m].value)}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {row.latency != null ? fmtMs(row.latency) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">{row.n ?? '—'}</td>
                </tr>
              )) : (
                ['Recognition only', '+ Quality gate', '+ Entry zone', '+ Liveness'].map(cfg => (
                  <tr key={cfg} className="border-t">
                    <td className="px-3 py-2 font-medium text-gray-500">{cfg}</td>
                    <td colSpan={8} className="px-3 py-2 text-gray-300 italic text-xs">
                      Awaiting experiment data
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {ablationRows && (
          <p className="text-xs text-gray-400 mt-2">
            † Values shown as percentages. Hover metric cells to see 95% Wilson CI.
            Wide intervals reflect small n — treat as indicative.
          </p>
        )}
      </div>

      {/* ── Baseline Comparison ── */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Baseline Comparison</h3>
        <p className="text-xs text-gray-500 mb-4">
          Manual vs. fingerprint vs. proposed system — measured session-level metrics.
          {!baselineRows && ' Run the baseline experiment to populate this table.'}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs">
              <tr>
                <th className="text-left px-3 py-2">System</th>
                <th className="text-right px-3 py-2">Duration (min)</th>
                <th className="text-right px-3 py-2">Effort (person-min)</th>
                <th className="text-right px-3 py-2">Throughput (/min)</th>
                <th className="text-right px-3 py-2">n sessions</th>
              </tr>
            </thead>
            <tbody>
              {baselineRows ? baselineRows.map(row => (
                <tr key={row.system} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium capitalize">{row.system.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {row.session_duration_min != null ? row.session_duration_min.toFixed(1) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {row.effort_person_min != null ? row.effort_person_min.toFixed(1) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {row.throughput_per_min != null ? row.throughput_per_min.toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">{row.n ?? '—'}</td>
                </tr>
              )) : (
                ['Manual', 'Fingerprint', 'Proposed'].map(sys => (
                  <tr key={sys} className="border-t">
                    <td className="px-3 py-2 font-medium text-gray-500">{sys}</td>
                    <td colSpan={4} className="px-3 py-2 text-gray-300 italic text-xs">
                      Awaiting experiment data
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
