import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api'

export default function AnalyticsPage() {
  const [experiments, setExperiments] = useState([])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchExperiments() }, [])

  const fetchExperiments = async () => {
    try {
      const res = await axios.get(API + '/experiments')
      setExperiments(res.data || [])
      const resultsMap = {}
      for (const exp of (res.data || [])) {
        try {
          const rRes = await axios.get(API + '/experiments/' + exp.id + '/results')
          resultsMap[exp.id] = rRes.data || []
        } catch { resultsMap[exp.id] = [] }
      }
      setResults(resultsMap)
    } catch { }
    finally { setLoading(false) }
  }

  if (loading) return <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mt-8"></div>

  const grouped = {}
  for (const exp of experiments) {
    if (!grouped[exp.experiment_type]) grouped[exp.experiment_type] = []
    grouped[exp.experiment_type].push(exp)
  }

  const renderResults = (expId) => {
    const expResults = results[expId]
    if (!expResults || expResults.length === 0) {
      return <p className="text-gray-400 text-sm italic">Awaiting experiment data</p>
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-2 py-1">Metric</th>
              <th className="text-right px-2 py-1">Value</th>
              <th className="text-right px-2 py-1">CI (95%)</th>
              <th className="text-right px-2 py-1">n</th>
              <th className="text-left px-2 py-1">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {expResults.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-2 py-1 font-medium">{r.metric_name}</td>
                <td className="px-2 py-1 text-right font-mono">{r.value.toFixed(4)}</td>
                <td className="px-2 py-1 text-right font-mono text-gray-500">
                  {r.ci_lower != null ? '[' + r.ci_lower.toFixed(4) + ', ' + r.ci_upper.toFixed(4) + ']' : '-'}
                </td>
                <td className="px-2 py-1 text-right">{r.sample_size}</td>
                <td className="px-2 py-1 text-gray-500">{r.condition || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const ablationConfigs = ['Recognition only', '+ Quality gate', '+ Entry zone', '+ Liveness']
  const baselineSystems = ['Manual', 'Fingerprint', 'Proposed']return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Research Analytics</h2>

      {experiments.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          No experiments have been run yet. Results appear here once experiments are executed.
        </div>
      ) : (
        Object.entries(grouped).map(([type, exps]) => (
          <div key={type} className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 capitalize mb-4">
              {type.replace(/_/g, ' ')} Experiments
            </h3>
            {exps.map(exp => (
              <div key={exp.id} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-gray-700">{exp.name}</p>
                  <span className="text-xs text-gray-400">
                    n={exp.participant_count || '?'} - {new Date(exp.created_at).toLocaleDateString()}
                  </span>
                </div>
                {renderResults(exp.id)}
              </div>
            ))}
          </div>
        ))
      )}

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Ablation Study</h3>
        <p className="text-sm text-gray-500 mb-4">
          Component contribution analysis - run the ablation experiment to populate.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Configuration</th>
                <th className="text-right px-3 py-2">Accuracy</th>
                <th className="text-right px-3 py-2">Precision</th>
                <th className="text-right px-3 py-2">Recall</th>
                <th className="text-right px-3 py-2">F1</th>
                <th className="text-right px-3 py-2">FAR</th>
                <th className="text-right px-3 py-2">FRR</th>
                <th className="text-right px-3 py-2">Latency</th>
                <th className="text-right px-3 py-2">n</th>
              </tr>
            </thead>
            <tbody>
              {ablationConfigs.map(config => (
                <tr key={config} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{config}</td>
                  <td className="px-3 py-2 text-right text-gray-400 italic" colSpan={8}>
                    Awaiting experiment data
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Baseline Comparison</h3>
        <p className="text-sm text-gray-500 mb-4">
          Manual vs. fingerprint vs. proposed system - run the baseline experiment to populate.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">System</th>
                <th className="text-right px-3 py-2">Duration (min)</th>
                <th className="text-right px-3 py-2">Human Effort</th>
                <th className="text-right px-3 py-2">Throughput</th>
              </tr>
            </thead>
            <tbody>
              {baselineSystems.map(sys => (
                <tr key={sys} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{sys}</td>
                  <td className="px-3 py-2 text-right text-gray-400 italic" colSpan={3}>
                    Awaiting experiment data
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}