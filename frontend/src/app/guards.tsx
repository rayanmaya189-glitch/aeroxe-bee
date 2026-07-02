import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || user.role === 'member') return <Navigate to="/member" replace />
  return <>{children}</>
}

export function MemberRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) return <Navigate to="/login" replace />
  // Admin users can see member pages too (they have full visibility)
  return <>{children}</>
}
