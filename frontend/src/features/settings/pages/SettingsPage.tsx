import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getProfile, updateProfile, changePassword } from '@/services/auth'

export function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
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
      .catch(() => {})
  }, [])

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setProfileMsg('')
    try {
      const data = await updateProfile({ name }) as Record<string, unknown>
      if (data && user) setUser({ ...user, name: String(data.name ?? name) })
      setProfileMsg('Profile updated successfully')
    } catch (err: unknown) {
      setProfileMsg(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setPasswordMsg('')
    try {
      await changePassword({ currentPassword, newPassword })
      setPasswordMsg('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: unknown) {
      setPasswordMsg(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Settings</h1>

      <div className="max-w-lg space-y-6">
        {/* ─── Profile ─────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Profile</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            {profileMsg && (
              <div className={`rounded-xl border p-3 text-sm ${profileMsg.includes('success') ? 'border-success/20 bg-success/5 text-success' : 'border-danger/20 bg-danger/5 text-danger'}`}>
                {profileMsg}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 transition-colors focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-[#1a2038] dark:bg-[#0d1220] dark:text-white dark:focus:border-primary-400/40 dark:focus:bg-[#111828] dark:focus:ring-primary-400/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-100 px-4 py-2.5 text-sm text-surface-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* ─── Password ────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordMsg && (
              <div className={`rounded-xl border p-3 text-sm ${passwordMsg.includes('success') ? 'border-success/20 bg-success/5 text-success' : 'border-danger/20 bg-danger/5 text-danger'}`}>
                {passwordMsg}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 transition-colors focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-[#1a2038] dark:bg-[#0d1220] dark:text-white dark:focus:border-primary-400/40 dark:focus:bg-[#111828] dark:focus:ring-primary-400/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1.5 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 transition-colors focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-[#1a2038] dark:bg-[#0d1220] dark:text-white dark:focus:border-primary-400/40 dark:focus:bg-[#111828] dark:focus:ring-primary-400/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md disabled:opacity-50"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
