import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AppLayout } from '@/components/layouts/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage').then((m) => ({ default: m.UsersPage })))
const AnalyticsPage = lazy(() => import('@/features/analytics/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const MemberDashboardPage = lazy(() => import('@/features/member/pages/MemberDashboardPage').then((m) => ({ default: m.MemberDashboardPage })))

function LazyLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" variant="rectangular" />
            ))}
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Skeleton className="h-96 w-96 rounded-2xl" variant="rectangular" /></div>}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <LazyLoader><DashboardPage /></LazyLoader> },
      { path: 'users', element: <LazyLoader><UsersPage /></LazyLoader> },
      { path: 'analytics', element: <LazyLoader><AnalyticsPage /></LazyLoader> },
      { path: 'settings', element: <LazyLoader><SettingsPage /></LazyLoader> },
      { path: 'member', element: <LazyLoader><MemberDashboardPage /></LazyLoader> },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={null}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]

export const router = createBrowserRouter(routes)
