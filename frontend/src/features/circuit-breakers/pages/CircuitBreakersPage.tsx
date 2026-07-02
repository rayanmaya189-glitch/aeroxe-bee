import { useState, useEffect } from 'react'
import { getCircuitBreakers, resetCircuitBreaker } from '@/services/dashboard'
import type { CircuitBreakerEvent } from '@/types/models'

export function CircuitBreakersPage() {
  const [events, setEvents] = useState<CircuitBreakerEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try { setLoading(true); setEvents(await getCircuitBreakers()) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleReset(scope: string, id: string) {
    if (!confirm(`Reset circuit breaker for ${scope}/${id}?`)) return
    try { await resetCircuitBreaker(scope, id); load() } catch { setError('Failed') }
  }

  const stateColor = (s: string) => s === 'CLOSED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    s === 'OPEN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Circuit Breakers</h1>
        <button onClick={load} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600">Refresh</button>
      </div>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr><th className="px-4 py-3">Scope</th><th className="px-4 py-3">ID</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center">Loading...</td></tr> :
              events.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No circuit breaker events</td></tr> :
              events.map((e, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">{e.scope}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.scope_value}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${stateColor(e.state)}`}>{e.state}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-sm truncate">{e.reason}</td>
                  <td className="px-4 py-3">
                    {e.state === 'OPEN' && (
                      <button onClick={() => handleReset(e.scope, e.scope_value)} className="rounded p-1 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400">Reset</button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
