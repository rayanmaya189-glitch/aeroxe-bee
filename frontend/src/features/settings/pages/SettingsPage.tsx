import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useAuthStore } from '@/store/authStore'
import { get2FAStatus, setup2FA, verify2FA, disable2FA, getPreferences, updatePreferences, getKycStatus, submitKyc } from '@/services/dashboard'
import { getProfile, updateProfile, getSessions, revokeSession, revokeAllSessions, type UserSession, listApiKeys, createApiKey, revokeApiKey, type ApiKeyInfo } from '@/services/auth'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { QRCodeSVG } from 'qrcode.react'
import {
  Settings, User, Lock, ShieldCheck, Bell, FileCheck,
  Eye, EyeOff, CheckCircle, AlertTriangle, Monitor, Smartphone, Globe, Trash2, Key, Plus, Copy, CopyCheck, ChevronRight, Terminal, Info,
} from 'lucide-react'

type Msg = { type: 'success' | 'error'; text: string } | null

interface ToggleProps {
  label: string
  description?: string
  enabled: boolean
  onChange: (v: boolean) => void
}

function Toggle({ label, description, enabled, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
          enabled ? 'bg-blue-600' : 'bg-white/[0.1]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'staff'

  // Profile
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [profileMsg, setProfileMsg] = useState<Msg>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<Msg>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [twoFALoading, setTwoFALoading] = useState(false)
  const [twoFAMsg, setTwoFAMsg] = useState<Msg>(null)
  const [showSetup2FA, setShowSetup2FA] = useState(false)
  const [twoFASecret, setTwoFASecret] = useState('')
  const [twoFAUrl, setTwoFAUrl] = useState('')
  const [twoFACode, setTwoFACode] = useState('')
  const [showDisable2FA, setShowDisable2FA] = useState(false)
  const [disable2FACode, setDisable2FACode] = useState('')

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(false)
  const [webhookNotifs, setWebhookNotifs] = useState(false)
  const [billingAlerts, setBillingAlerts] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [notifMsg, setNotifMsg] = useState<Msg>(null)
  const [notifLoading, setNotifLoading] = useState(false)

  // Sessions
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionMsg, setSessionMsg] = useState<Msg>(null)

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [apiKeyMsg, setApiKeyMsg] = useState<Msg>(null)
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['send', 'read'])
  const [newKeyExpiry, setNewKeyExpiry] = useState('')
  const [createKeyLoading, setCreateKeyLoading] = useState(false)
  const [createdKeyValue, setCreatedKeyValue] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [detailKey, setDetailKey] = useState<ApiKeyInfo | null>(null)
  const [copiedExample, setCopiedExample] = useState(false)

  // KYC
  const [kycStatus, setKycStatus] = useState<string>('not_submitted')
  const [showKYCForm, setShowKYCForm] = useState(false)
  const [kycFullName, setKycFullName] = useState('')
  const [kycDocType, setKycDocType] = useState('passport')
  const [kycDocNumber, setKycDocNumber] = useState('')
  const [kycDocUrl, setKycDocUrl] = useState('')
  const [kycMsg, setKycMsg] = useState<Msg>(null)
  const [kycLoading, setKycLoading] = useState(false)

  // Load data on mount
  useEffect(() => {
    getProfile().then((data) => {
      if (data) {
        const p = data as Record<string, unknown>
        setName(String(p.name ?? ''))
        setEmail(String(p.email ?? ''))
      }
    }).catch(() => {})

    get2FAStatus().then((data) => setTwoFAEnabled(data.enabled)).catch(() => {})

    getPreferences().then((data) => {
      setEmailNotifs(data.email_notifications)
      setSmsNotifs(data.sms_notifications)
      setWebhookNotifs(data.webhook_notifications)
      setBillingAlerts(data.billing_alerts)
      setSecurityAlerts(data.security_alerts)
    }).catch(() => {})

    getKycStatus().then((data) => {
      setKycStatus(data.status)
      if (data.full_name) setKycFullName(data.full_name)
      if (data.document_type) setKycDocType(data.document_type)
    }).catch(() => {})

    loadSessions()
    loadApiKeys()
  }, [])

  // Profile update
  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg(null)
    try {
      const data = await updateProfile({ name }) as Record<string, unknown>
      if (data && user) setUser({ ...user, name: String(data.name ?? name) })
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' })
    } catch (err: unknown) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile' })
    } finally {
      setProfileLoading(false)
    }
  }

  // Password change
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMsg(null)
    try {
      const auth = await import('@/services/auth')
      await auth.changePassword({ currentPassword, newPassword })
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' })
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: unknown) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password' })
    } finally {
      setPasswordLoading(false)
    }
  }

  // 2FA setup
  async function handleSetup2FA() {
    setTwoFALoading(true)
    setTwoFAMsg(null)
    try {
      const data = await setup2FA()
      setTwoFASecret(data.secret)
      setTwoFAUrl(data.url)
      setShowSetup2FA(true)
    } catch (err: unknown) {
      setTwoFAMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to setup 2FA' })
    } finally {
      setTwoFALoading(false)
    }
  }

  // 2FA verify
  async function handleVerify2FA() {
    setTwoFALoading(true)
    setTwoFAMsg(null)
    try {
      await verify2FA(twoFACode)
      setTwoFAEnabled(true)
      setShowSetup2FA(false)
      setTwoFACode('')
      setTwoFASecret('')
      setTwoFAUrl('')
      setTwoFAMsg({ type: 'success', text: '2FA enabled successfully' })
    } catch (err: unknown) {
      setTwoFAMsg({ type: 'error', text: err instanceof Error ? err.message : 'Invalid code' })
    } finally {
      setTwoFALoading(false)
    }
  }

  // 2FA disable
  async function handleDisable2FA() {
    setTwoFALoading(true)
    setTwoFAMsg(null)
    try {
      await disable2FA(disable2FACode)
      setTwoFAEnabled(false)
      setShowDisable2FA(false)
      setDisable2FACode('')
      setTwoFAMsg({ type: 'success', text: '2FA disabled successfully' })
    } catch (err: unknown) {
      setTwoFAMsg({ type: 'error', text: err instanceof Error ? err.message : 'Invalid code' })
    } finally {
      setTwoFALoading(false)
    }
  }

  // Notifications
  async function handleSaveNotifications() {
    setNotifLoading(true)
    setNotifMsg(null)
    try {
      await updatePreferences({
        email_notifications: emailNotifs,
        sms_notifications: smsNotifs,
        webhook_notifications: webhookNotifs,
        billing_alerts: billingAlerts,
        security_alerts: securityAlerts,
      })
      setNotifMsg({ type: 'success', text: 'Notification preferences saved' })
    } catch (err: unknown) {
      setNotifMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save preferences' })
    } finally {
      setNotifLoading(false)
    }
  }

  // Load sessions
  async function loadSessions() {
    setSessionsLoading(true)
    try {
      const data = await getSessions()
      setSessions(data)
    } catch {
      // Silently fail
    } finally {
      setSessionsLoading(false)
    }
  }

  // Revoke single session
  async function handleRevokeSession(sessionId: string) {
    setSessionMsg(null)
    try {
      await revokeSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      setSessionMsg({ type: 'success', text: 'Session revoked' })
    } catch (err: unknown) {
      setSessionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to revoke session' })
    }
  }

  // Revoke all other sessions
  async function handleRevokeAllSessions() {
    setSessionMsg(null)
    try {
      await revokeAllSessions()
      // Reload to keep only current session
      await loadSessions()
      setSessionMsg({ type: 'success', text: 'All other sessions revoked' })
    } catch (err: unknown) {
      setSessionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to revoke sessions' })
    }
  }

  // Parse user agent into friendly name
  function parseUA(ua: string): { browser: string; os: string; icon: React.ReactNode } {
    const lower = ua.toLowerCase()
    if (lower.includes('chrome') && !lower.includes('edg')) return { browser: 'Chrome', os: lower.includes('android') ? 'Android' : 'Desktop', icon: <Globe className="h-4 w-4" /> }
    if (lower.includes('firefox')) return { browser: 'Firefox', os: 'Desktop', icon: <Globe className="h-4 w-4" /> }
    if (lower.includes('safari') && !lower.includes('chrome')) return { browser: 'Safari', os: 'macOS', icon: <Monitor className="h-4 w-4" /> }
    if (lower.includes('edg')) return { browser: 'Edge', os: 'Desktop', icon: <Globe className="h-4 w-4" /> }
    if (lower.includes('android')) return { browser: 'Browser', os: 'Android', icon: <Smartphone className="h-4 w-4" /> }
    if (lower.includes('iphone') || lower.includes('ipad')) return { browser: 'Safari', os: 'iOS', icon: <Smartphone className="h-4 w-4" /> }
    return { browser: 'Unknown', os: 'Unknown', icon: <Globe className="h-4 w-4" /> }
  }

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Load API keys
  async function loadApiKeys() {
    setApiKeysLoading(true)
    try {
      const data = await listApiKeys()
      setApiKeys(data.filter((k) => !k.revoked_at))
    } catch {
      // Silently fail
    } finally {
      setApiKeysLoading(false)
    }
  }

  // Create API key
  async function handleCreateApiKey(e: React.FormEvent) {
    e.preventDefault()
    setCreateKeyLoading(true)
    setApiKeyMsg(null)
    try {
      const result = await createApiKey({
        label: newKeyName,
        scopes: newKeyScopes,
        expires_in: newKeyExpiry || undefined,
      })
      setCreatedKeyValue(result.api_key)
      setNewKeyName('')
      setNewKeyScopes(['send', 'read'])
      setNewKeyExpiry('')
      setShowCreateKey(false)
      await loadApiKeys()
    } catch (err: unknown) {
      setApiKeyMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create API key' })
    } finally {
      setCreateKeyLoading(false)
    }
  }

  // Revoke API key
  async function handleRevokeApiKey(keyId: string) {
    setApiKeyMsg(null)
    try {
      await revokeApiKey(keyId)
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId))
      setApiKeyMsg({ type: 'success', text: 'API key revoked' })
    } catch (err: unknown) {
      setApiKeyMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to revoke API key' })
    }
  }

  // Copy API key to clipboard
  async function handleCopyKey(key: string) {
    await navigator.clipboard.writeText(key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const availableScopes = ['send', 'read', 'otp', 'webhook']

  function toggleScope(scope: string) {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  // Scope descriptions for detail view
  const scopeDescriptions: Record<string, { label: string; description: string }> = {
    send:   { label: 'Send messages', description: 'Allows sending SMS messages via POST /api/v1/send' },
    read:   { label: 'Read messages', description: 'Allows listing and reading message history via GET /api/v1/messages' },
    otp:    { label: 'Send & verify OTP', description: 'Allows sending and verifying one-time passwords via /api/v1/otp/*' },
    webhook: { label: 'Webhook access', description: 'Allows managing webhook endpoints for delivery notifications' },
  }

  function generateUsageExample(key: ApiKeyInfo): string {
    const scopes = key.scopes || []
    if (scopes.includes('send')) {
      return `curl -X POST https://api.aeroxe.com/api/v1/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "+1234567890",
    "message": "Hello from AeroXe!",
    "message_type": "transactional",
    "idempotency_key": "unique-req-001"
  }'`
    }
    if (scopes.includes('otp')) {
      return `# Send OTP
curl -X POST https://api.aeroxe.com/api/v1/otp/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "length": 6}'

# Verify OTP
curl -X POST https://api.aeroxe.com/api/v1/otp/verify \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "code": "123456"}'`
    }
    if (scopes.includes('read')) {
      return `curl https://api.aeroxe.com/api/v1/messages \
  -H "Authorization: Bearer YOUR_API_KEY"`
    }
    return `# Use this key with the AeroXe API
curl https://api.aeroxe.com/api/v1/health \
  -H "Authorization: Bearer YOUR_API_KEY"`
  }

  async function handleCopyExample(text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedExample(true)
    setTimeout(() => setCopiedExample(false), 2000)
  }

  // KYC submit
  async function handleKYCSubmit(e: React.FormEvent) {
    e.preventDefault()
    setKycLoading(true)
    setKycMsg(null)
    try {
      await submitKyc({ full_name: kycFullName, document_type: kycDocType, document_number: kycDocNumber, document_url: kycDocUrl })
      setKycStatus('pending')
      setShowKYCForm(false)
      setKycMsg({ type: 'success', text: 'KYC submitted for review' })
    } catch (err: unknown) {
      setKycMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to submit KYC' })
    } finally {
      setKycLoading(false)
    }
  }

  const kycStatusLabel: Record<string, { text: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
    verified: { text: 'Verified', variant: 'success' },
    pending: { text: 'Pending review', variant: 'warning' },
    rejected: { text: 'Rejected', variant: 'danger' },
    not_submitted: { text: 'Not submitted', variant: 'info' },
  }

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-purple-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Settings</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Manage your account, security, and preferences</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: forms */}
        <div className="space-y-6 lg:col-span-2">
          {/* ─── Profile ─── */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                    <User className="h-4 w-4 text-blue-400" />
                  </div>
                  <CardTitle>Profile</CardTitle>
                </div>
              </CardHeader>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                {profileMsg && <MsgBanner msg={profileMsg} />}
                <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Email" value={email} disabled hint="Contact support to change your email" />
                <Button type="submit" loading={profileLoading}>Save changes</Button>
              </form>
            </Card>
          </motion.div>

          {/* ─── Password ─── */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                    <Lock className="h-4 w-4 text-amber-400" />
                  </div>
                  <CardTitle>Change password</CardTitle>
                </div>
              </CardHeader>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordMsg && <MsgBanner msg={passwordMsg} />}
                <div className="relative">
                  <Input label="Current password" type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-9 text-gray-500 hover:text-gray-300">
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Input label="New password" type={showNewPw ? 'text' : 'password'} hint="Minimum 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-9 text-gray-500 hover:text-gray-300">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="submit" loading={passwordLoading}>Change password</Button>
              </form>
            </Card>
          </motion.div>

          {/* ─── Notifications ─── */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/20">
                    <Bell className="h-4 w-4 text-cyan-400" />
                  </div>
                  <CardTitle>Notifications</CardTitle>
                </div>
              </CardHeader>
              <div className="divide-y divide-white/[0.06]">
                {notifMsg && <div className="pb-2"><MsgBanner msg={notifMsg} /></div>}
                <Toggle label="Email notifications" description="Receive updates and alerts via email" enabled={emailNotifs} onChange={setEmailNotifs} />
                <Toggle label="SMS notifications" description="Get critical alerts via SMS" enabled={smsNotifs} onChange={setSmsNotifs} />
                <Toggle label="Webhook notifications" description="Forward events to your configured endpoints" enabled={webhookNotifs} onChange={setWebhookNotifs} />
                <Toggle label="Billing alerts" description="Payment due, subscription expiry, and invoice notifications" enabled={billingAlerts} onChange={setBillingAlerts} />
                <Toggle label="Security alerts" description="Login attempts, password changes, and suspicious activity" enabled={securityAlerts} onChange={setSecurityAlerts} />
              </div>
              <div className="mt-4">
                <Button onClick={handleSaveNotifications} loading={notifLoading}>Save preferences</Button>
              </div>
            </Card>
          </motion.div>

          {/* ─── Active Sessions ─── */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
                      <Monitor className="h-4 w-4 text-indigo-400" />
                    </div>
                    <CardTitle>Active Sessions</CardTitle>
                  </div>
                  {sessions.length > 1 && (
                    <Button variant="danger" size="xs" onClick={handleRevokeAllSessions}>Revoke all others</Button>
                  )}
                </div>
              </CardHeader>
              {sessionMsg && <MsgBanner msg={sessionMsg} />}
              {sessionsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-gray-500">No active sessions</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((sess) => {
                    const { browser, os, icon } = parseUA(sess.user_agent || '')
                    return (
                      <div key={sess.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05]">
                            {icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-200">{browser} · {os}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{sess.ip_address || 'Unknown IP'}</span>
                              <span>·</span>
                              <span>{formatTimeAgo(sess.last_active || sess.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="xs" className="text-gray-500 hover:text-red-400" onClick={() => handleRevokeSession(sess.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </motion.div>

          {/* ─── API Keys (members only) ─── */}
          {!isAdmin && (
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 ring-1 ring-orange-500/20">
                      <Key className="h-4 w-4 text-orange-400" />
                    </div>
                    <CardTitle>API Keys</CardTitle>
                  </div>
                  <Button size="xs" onClick={() => { setShowCreateKey(true); setNewKeyName(''); setNewKeyScopes(['send', 'read']); setNewKeyExpiry('') }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> New key
                  </Button>
                </div>
              </CardHeader>
              {apiKeyMsg && <MsgBanner msg={apiKeyMsg} />}
              {createdKeyValue && (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-emerald-400 mb-1">Your new API key (shown only once):</p>
                      <code className="block break-all font-mono text-xs text-gray-200 bg-black/20 rounded-lg p-2">{createdKeyValue}</code>
                    </div>
                    <button onClick={() => handleCopyKey(createdKeyValue)} className="shrink-0 rounded-lg bg-white/[0.06] p-2 text-gray-400 hover:text-white transition-colors">
                      {copiedKey ? <CopyCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-amber-400">Copy this key now — you won't be able to see it again.</p>
                  <button onClick={() => setCreatedKeyValue(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-300">Dismiss</button>
                </div>
              )}
              {apiKeysLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
                  ))}
                </div>
              ) : apiKeys.length === 0 ? (
                <p className="text-sm text-gray-500">No API keys yet. Create one to start using the API.</p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <button key={key.id} onClick={() => setDetailKey(key)} className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05]">
                          <Key className="h-4 w-4 text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-200">{key.label}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{key.scopes?.join(', ')}</span>
                            {key.expires_at && <><span>·</span><span>Expires {new Date(key.expires_at).toLocaleDateString()}</span></>}
                            <span>·</span><span>{formatTimeAgo(key.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600">
                            <span>{(key.request_count ?? 0).toLocaleString()} requests</span>
                            {key.last_used_at && <><span>·</span><span>Last used {formatTimeAgo(key.last_used_at)}</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="xs" className="text-gray-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleRevokeApiKey(key.id) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
          )}
        </div>

        {/* Right column: security sidebar */}
        <div className="space-y-6">
          {/* ─── 2FA ─── */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </div>
                  <CardTitle>Two-factor auth</CardTitle>
                </div>
              </CardHeader>
              {twoFAMsg && <MsgBanner msg={twoFAMsg} />}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">Status</p>
                  <Badge variant={twoFAEnabled ? 'success' : 'warning'} size="sm" className="mt-1">
                    {twoFAEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                {twoFAEnabled ? (
                  <Button variant="danger" size="sm" onClick={() => setShowDisable2FA(true)} loading={twoFALoading}>Disable</Button>
                ) : (
                  <Button size="sm" onClick={handleSetup2FA} loading={twoFALoading}>Enable 2FA</Button>
                )}
              </div>
              {!twoFAEnabled && (
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <p className="text-xs text-amber-400">2FA is recommended for account security. Enable it to protect your account.</p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>

          {/* ─── KYC (members only) ─── */}
          {!isAdmin && (
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                    <FileCheck className="h-4 w-4 text-violet-400" />
                  </div>
                  <CardTitle>Identity verification</CardTitle>
                </div>
              </CardHeader>
              {kycMsg && <MsgBanner msg={kycMsg} />}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">KYC Status</p>
                  <Badge variant={kycStatusLabel[kycStatus]?.variant ?? 'info'} size="sm" className="mt-1">{kycStatusLabel[kycStatus]?.text ?? 'Unknown'}</Badge>
                </div>
                {kycStatus === 'not_submitted' || kycStatus === 'rejected' ? (
                  <Button size="sm" onClick={() => setShowKYCForm(true)}>Submit</Button>
                ) : kycStatus === 'pending' ? (
                  <span className="text-xs text-gray-500">Under review</span>
                ) : null}
              </div>
            </Card>
          </motion.div>
          )}

          {/* ─── Security info ─── */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-red-500/20">
                    <ShieldCheck className="h-4 w-4 text-red-400" />
                  </div>
                  <CardTitle>Security</CardTitle>
                </div>
              </CardHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Password</span>
                  <Badge variant="success" size="sm">Set</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Two-factor auth</span>
                  <Badge variant={twoFAEnabled ? 'success' : 'warning'} size="sm">{twoFAEnabled ? 'On' : 'Off'}</Badge>
                </div>
                {!isAdmin && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">KYC verification</span>
                  <Badge variant={kycStatusLabel[kycStatus]?.variant ?? 'info'} size="sm">{kycStatusLabel[kycStatus]?.text ?? 'Unknown'}</Badge>
                </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last login</span>
                  <span className="text-gray-300">{user ? 'Current session' : '—'}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ─── 2FA Setup Modal ─── */}
      <Modal open={showSetup2FA} onClose={() => { setShowSetup2FA(false); setTwoFACode('') }} title="Enable two-factor authentication">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            {twoFAUrl ? (
              <div className="mx-auto mb-3 inline-block rounded-2xl bg-white p-4">
                <QRCodeSVG value={twoFAUrl} size={180} level="M" includeMargin={false} />
              </div>
            ) : (
              <div className="mx-auto mb-3 flex h-[208px] w-[208px] items-center justify-center rounded-2xl bg-white/[0.04]">
                <span className="text-sm text-gray-500">Loading QR code...</span>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">Scan this QR code with your authenticator app</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400">Or enter manually</summary>
              <div className="mt-2 rounded-lg bg-white/[0.04] p-2">
                <p className="text-[10px] text-gray-500">Manual key</p>
                <p className="font-mono text-sm font-semibold tracking-wider text-gray-200">{twoFASecret}</p>
              </div>
              <div className="mt-2 rounded-lg bg-white/[0.04] p-2">
                <p className="text-[10px] text-gray-500">URI</p>
                <p className="break-all font-mono text-[10px] text-gray-400">{twoFAUrl}</p>
              </div>
            </details>
          </div>
          <div>
            <p className="mb-2 text-xs text-gray-400">Enter the 6-digit code from your app to verify:</p>
            <Input
              placeholder="000000"
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-lg tracking-[0.5em] font-mono"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowSetup2FA(false); setTwoFACode('') }}>Cancel</Button>
            <Button size="sm" onClick={handleVerify2FA} loading={twoFALoading} disabled={twoFACode.length !== 6}>Verify & enable</Button>
          </div>
        </div>
      </Modal>

      {/* ─── 2FA Disable Modal ─── */}
      <Modal open={showDisable2FA} onClose={() => { setShowDisable2FA(false); setDisable2FACode('') }} title="Disable two-factor authentication">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Enter your current 2FA code to confirm disabling:</p>
          <Input
            placeholder="000000"
            value={disable2FACode}
            onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="text-center text-lg tracking-[0.5em] font-mono"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowDisable2FA(false); setDisable2FACode('') }}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDisable2FA} loading={twoFALoading} disabled={disable2FACode.length !== 6}>Disable 2FA</Button>
          </div>
        </div>
      </Modal>

      {/* ─── KYC Form Modal ─── */}
      <Modal open={showKYCForm} onClose={() => setShowKYCForm(false)} title="Submit identity verification">
        <form onSubmit={handleKYCSubmit} className="space-y-4">
          <Input label="Full legal name" value={kycFullName} onChange={(e) => setKycFullName(e.target.value)} placeholder="As shown on your ID" required />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Document type</label>
            <select
              value={kycDocType}
              onChange={(e) => setKycDocType(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver&apos;s License</option>
              <option value="national_id">National ID</option>
            </select>
          </div>
          <Input label="Document number" value={kycDocNumber} onChange={(e) => setKycDocNumber(e.target.value)} placeholder="e.g. AB1234567" required />
          <Input label="Document URL" value={kycDocUrl} onChange={(e) => setKycDocUrl(e.target.value)} placeholder="https://drive.google.com/..." hint="Link to a scanned copy of your document" required />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowKYCForm(false)}>Cancel</Button>
            <Button size="sm" type="submit" loading={kycLoading}>Submit for review</Button>
          </div>
        </form>
      </Modal>
      {/* ─── API Key Detail Modal ─── */}
      <Modal open={!!detailKey} onClose={() => { setDetailKey(null); setCopiedExample(false) }} title="API key details">
        {detailKey && (() => {
          const example = generateUsageExample(detailKey)
          return (
            <div className="space-y-5">
              {/* Key info */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-200">{detailKey.label}</h4>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="text-gray-300">{new Date(detailKey.created_at).toLocaleDateString()} at {new Date(detailKey.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Expires</p>
                    <p className="text-gray-300">{detailKey.expires_at ? new Date(detailKey.expires_at).toLocaleDateString() : 'Never'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Requests</p>
                    <p className="text-gray-300 font-medium">{(detailKey.request_count ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last used</p>
                    <p className="text-gray-300">{detailKey.last_used_at ? formatTimeAgo(detailKey.last_used_at) : 'Never'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Key ID</p>
                    <p className="font-mono text-gray-400 text-[11px] break-all">{detailKey.id}</p>
                  </div>
                </div>
              </div>

              {/* Scope details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-blue-400" />
                  <h4 className="text-sm font-semibold text-gray-200">Permissions</h4>
                </div>
                <div className="space-y-2">
                  {(detailKey.scopes || []).map((scope) => {
                    const meta = scopeDescriptions[scope]
                    return (
                      <div key={scope} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <p className="text-xs font-medium text-gray-200">{meta?.label ?? scope}</p>
                        </div>
                        <p className="text-[11px] text-gray-500 ml-3.5">{meta?.description ?? `Scope: ${scope}`}</p>
                      </div>
                    )
                  })}
                  {(!detailKey.scopes || detailKey.scopes.length === 0) && (
                    <p className="text-xs text-gray-500">No scopes configured</p>
                  )}
                </div>
              </div>

              {/* Usage example */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-purple-400" />
                    <h4 className="text-sm font-semibold text-gray-200">Usage example</h4>
                  </div>
                  <button onClick={() => handleCopyExample(example)} className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] text-gray-400 hover:text-white transition-colors">
                    {copiedExample ? <CopyCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedExample ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/30 p-3 text-[11px] leading-relaxed text-gray-300 font-mono">
                  {example}
                </pre>
              </div>

              <Button variant="ghost" size="sm" className="w-full" onClick={() => { setDetailKey(null); setCopiedExample(false) }}>Close</Button>
            </div>
          )
        })()}
      </Modal>

      {/* ─── Create API Key Modal ─── */}
      <Modal open={showCreateKey} onClose={() => setShowCreateKey(false)} title="Create API key">
        <form onSubmit={handleCreateApiKey} className="space-y-4">
          <Input label="Key name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Production server" required />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {availableScopes.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    newKeyScopes.includes(scope)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-gray-500">Select what this key can access</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Expiration (optional)</label>
            <select
              value={newKeyExpiry}
              onChange={(e) => setNewKeyExpiry(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">Never expires</option>
              <option value="24h">24 hours</option>
              <option value="720h">30 days</option>
              <option value="2160h">90 days</option>
              <option value="8760h">1 year</option>
            </select>
          </div>
          {newKeyScopes.length === 0 && (
            <p className="text-xs text-amber-400">Select at least one scope</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowCreateKey(false)}>Cancel</Button>
            <Button size="sm" type="submit" loading={createKeyLoading} disabled={!newKeyName || newKeyScopes.length === 0}>Create key</Button>
          </div>
        </form>
      </Modal>
    </motion.div>
    </PageTransition>
  )
}

function MsgBanner({ msg }: { msg: { type: 'success' | 'error'; text: string } }) {
  return (
    <div className={`mb-3 rounded-xl border p-3 text-sm ${
      msg.type === 'success'
        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
        : 'border-red-500/20 bg-red-500/5 text-red-400'
    }`}>
      <div className="flex items-center gap-2">
        {msg.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
        {msg.text}
      </div>
    </div>
  )
}
