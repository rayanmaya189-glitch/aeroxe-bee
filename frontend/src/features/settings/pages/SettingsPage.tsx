import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getProfile, updateProfile, changePassword } from '@/services/auth'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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
        if (data) {
          const profile = data as Record<string, unknown>
          setName(String(profile.name ?? ''))
          setEmail(String(profile.email ?? ''))
        }
      })
      .catch((err: unknown) => {
        setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load profile' })
      })
  }, [])

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setProfileMsg(null)
    try {
      const data = await updateProfile({ name }) as Record<string, unknown>
      if (data && user) setUser({ ...user, name: String(data.name ?? name) })
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' })
    } catch (err: unknown) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setPasswordMsg(null)
    try {
      await changePassword({ currentPassword, newPassword })
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' })
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: unknown) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="max-w-lg space-y-6">
        <Card>
          <CardHeader className="mb-4">
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            {profileMsg && (
              <div className={`rounded-lg border p-3 text-sm ${profileMsg.type === 'success' ? 'border-success-200 bg-success-50 text-success-700 dark:border-success-800/50 dark:bg-success-900/20 dark:text-success-300' : 'border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-800/50 dark:bg-danger-900/20 dark:text-danger-300'}`}>
                {profileMsg.text}
              </div>
            )}
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" value={email} disabled hint="Contact support to change your email" />
            <Button type="submit" loading={loading}>Save changes</Button>
          </form>
        </Card>

        <Card>
          <CardHeader className="mb-4">
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordMsg && (
              <div className={`rounded-lg border p-3 text-sm ${passwordMsg.type === 'success' ? 'border-success-200 bg-success-50 text-success-700 dark:border-success-800/50 dark:bg-success-900/20 dark:text-success-300' : 'border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-800/50 dark:bg-danger-900/20 dark:text-danger-300'}`}>
                {passwordMsg.text}
              </div>
            )}
            <Input label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            <Input label="New password" type="password" hint="Minimum 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
            <Button type="submit" loading={loading}>Change password</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
