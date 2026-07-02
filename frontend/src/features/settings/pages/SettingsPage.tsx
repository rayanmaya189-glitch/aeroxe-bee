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
      .then((data: Record<string, unknown>) => {
        if (data) {
          setName(String(data.name ?? ''))
          setEmail(String(data.email ?? ''))
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
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      <div className="max-w-lg space-y-6">
        <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-700">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            {profileMsg && <div className={`rounded-lg p-2 text-sm ${profileMsg.includes('success') ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>{profileMsg}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input type="email" value={email} disabled
                className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800" />
            </div>
            <button type="submit" disabled={loading}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-700">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordMsg && <div className={`rounded-lg p-2 text-sm ${passwordMsg.includes('success') ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>{passwordMsg}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>
            <button type="submit" disabled={loading}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
