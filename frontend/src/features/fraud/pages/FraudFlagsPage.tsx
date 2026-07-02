import { useState, useEffect } from 'react'
import { getFraudFlags, reviewFraudFlag } from '@/services/dashboard'
import type { FraudFlag } from '@/types/models'

export function FraudFlagsPage() {
  const [flags, setFlags] = useState<FraudFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try { setLoading(true); setFlags(await getFraudFlags()) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleReview(id: string) {
    try { await reviewFraudFlag(id); load() } catch { setError('Failed') }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fraud Flags</h1>
        <button onClick={load} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600">Refresh</button>
      </div>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Weight</th><th className="px-4 py-3">Reviewed</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center">Loading...</td></tr> :
              flags.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No fraud flags</td></tr> :
              flags.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">{f.flag_type}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-sm truncate">{f.description}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${f.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{f.severity}</span></td>
                  <td className="px-4 py-3">{f.weight.toFixed(2)}</td>
                  <td className="px-4 py-3">{f.reviewed ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(f.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {!f.reviewed && <button onClick={() => handleReview(f.id)} className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400">Mark Reviewed</button>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
