import { useState, useEffect } from 'react'
import { getDeadLetters, retryDeadLetter } from '@/services/dashboard'
import type { DeadLetter } from '@/types/models'

export function DeadLettersPage() {
  const [letters, setLetters] = useState<DeadLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try { setLoading(true); setLetters(await getDeadLetters()) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleRetry(id: string) {
    try { await retryDeadLetter(id); load() } catch { setError('Failed') }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dead Letter Queue</h1>
        <button onClick={load} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600">Refresh</button>
      </div>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr><th className="px-4 py-3">Stream</th><th className="px-4 py-3">Message ID</th><th className="px-4 py-3">Fail Reason</th><th className="px-4 py-3">Retries</th><th className="px-4 py-3">Failed At</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center">Loading...</td></tr> :
              letters.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No dead letters</td></tr> :
              letters.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">{l.stream}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.message_id}</td>
                  <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400 max-w-xs truncate">{l.fail_reason}</td>
                  <td className="px-4 py-3">{l.retry_count}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(l.failed_at).toLocaleString()}</td>
                  <td className="px-4 py-3"><button onClick={() => handleRetry(l.id)} className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400">Retry</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
