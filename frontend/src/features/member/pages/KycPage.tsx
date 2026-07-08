import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { getKycStatus, submitKyc } from '@/services/dashboard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { staggerContainer, fadeInUp } from '@/components/animations/variants'
import {
  FileCheck, AlertCircle, CheckCircle, Clock, Shield,
} from 'lucide-react'

type Msg = { type: 'success' | 'error'; text: string } | null

const statusLabels: Record<string, { text: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  not_submitted: { text: 'Not Submitted', variant: 'warning' },
  pending: { text: 'Under Review', variant: 'info' },
  approved: { text: 'Verified', variant: 'success' },
  verified: { text: 'Verified', variant: 'success' },
  rejected: { text: 'Rejected', variant: 'danger' },
}

export function KycPage() {
  const [status, setStatus] = useState<string>('not_submitted')
  const [fullName, setFullName] = useState('')
  const [docType, setDocType] = useState('passport')
  const [docNumber, setDocNumber] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  useEffect(() => {
    getKycStatus()
      .then((data) => {
        setStatus(data.status)
        if (data.full_name) setFullName(data.full_name)
        if (data.document_type) setDocType(data.document_type)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMsg(null)
    try {
      await submitKyc({
        full_name: fullName,
        document_type: docType,
        document_number: docNumber,
        document_url: docUrl,
      })
      setStatus('pending')
      setMsg({ type: 'success', text: 'KYC submitted for review' })
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to submit KYC' })
    } finally {
      setSubmitting(false)
    }
  }

  const label = statusLabels[status]

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
        {/* Hero */}
        <motion.div variants={fadeInUp}>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/10 blur-[80px]" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-indigo-600/10 blur-[60px]" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                  <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                    Identity Verification
                  </span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">
                  Verify your identity to unlock higher sending limits
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status Card */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                  <FileCheck className="h-4 w-4 text-violet-400" />
                </div>
                <CardTitle>KYC Status</CardTitle>
              </div>
            </CardHeader>
            {msg && (
              <div className={`flex items-start gap-3 rounded-xl border p-4 mb-4 ${
                msg.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}>
                {msg.type === 'success'
                  ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                }
                <div className="text-sm text-gray-300">{msg.text}</div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-200">Status</p>
                <Badge variant={label?.variant ?? 'info'} size="sm" className="mt-1">
                  {label?.text ?? 'Unknown'}
                </Badge>
              </div>
              {status === 'pending' && (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <Clock className="h-4 w-4" />
                  Under review
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Form (only when not submitted or rejected) */}
        {(status === 'not_submitted' || status === 'rejected') && (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader className="mb-4">
                <CardTitle>
                  {status === 'rejected' ? 'Resubmit Verification' : 'Submit Verification'}
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full legal name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="As shown on your ID"
                  required
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Document type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-gray-200 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                  >
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver&apos;s License</option>
                    <option value="national_id">National ID</option>
                  </select>
                </div>
                <Input
                  label="Document number"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="e.g. AB1234567"
                  required
                />
                <Input
                  label="Document URL"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  hint="Link to a scanned copy of your document"
                  required
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" type="submit" loading={submitting}>
                    {status === 'rejected' ? 'Resubmit for review' : 'Submit for review'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Verified state */}
        {status === 'approved' || status === 'verified' ? (
          <motion.div variants={fadeInUp}>
            <Card>
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Identity Verified</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Your identity has been verified successfully
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : null}
      </motion.div>
    </PageTransition>
  )
}
