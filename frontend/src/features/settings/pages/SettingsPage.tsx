import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useAuthStore } from '@/store/authStore'
import { getProfile, updateProfile, changePassword } from '@/services/auth'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Settings, User, Lock } from 'lucide-react'

export function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (data) { const profile = data as Record<string, unknown>; setName(String(profile.name ?? '')); setEmail(String(profile.email ?? '')) }
      })
      .catch((err: unknown) => { setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load profile' }) })
  }, [])

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setProfileMsg(null)
    try {
      const data = await updateProfile({ name }) as Record<string, unknown>
      if (data && user) setUser({ ...user, name: String(data.name ?? name) })
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' })
    } catch (err: unknown) { setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile' })
    } finally { setLoading(false) }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setPasswordMsg(null)
    try {
      await changePassword({ currentPassword, newPassword })
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' }); setCurrentPassword(''); setNewPassword('')
    } catch (err: unknown) { setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password' })
    } finally { setLoading(false) }
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
              <p className="mt-1 text-sm text-gray-400">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-lg space-y-6">
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
              {profileMsg && (
                <div className={`rounded-xl border p-3 text-sm ${profileMsg.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'}`}>
                  {profileMsg.text}
                </div>
              )}
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Email" value={email} disabled hint="Contact support to change your email" />
              <Button type="submit" loading={loading}>Save changes</Button>
            </form>
          </Card>
        </motion.div>

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
              {passwordMsg && (
                <div className={`rounded-xl border p-3 text-sm ${passwordMsg.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'}`}>
                  {passwordMsg.text}
                </div>
              )}
              <Input label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              <Input label="New password" type="password" hint="Minimum 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
              <Button type="submit" loading={loading}>Change password</Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </motion.div>
    </PageTransition>
  )
}
