import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router-dom'
import { AppLayout } from '@/components/layouts/AppLayout'
import { AuthLayout } from '@/components/layouts/AuthLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useAuthStore } from '@/store/authStore'
import { AdminRoute, MemberRoute } from './guards'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage').then((m) => ({ default: m.UsersPage })))
const AnalyticsPage = lazy(() => import('@/features/analytics/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const BIDashboardPage = lazy(() => import('@/features/analytics/pages/BIDashboardPage').then((m) => ({ default: m.BIDashboardPage })))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const MemberDashboardPage = lazy(() => import('@/features/member/pages/MemberDashboardPage').then((m) => ({ default: m.MemberDashboardPage })))
const MemberDevicesPage = lazy(() => import('@/features/member/pages/MemberDevicesPage').then((m) => ({ default: m.MemberDevicesPage })))
const MemberMessagesPage = lazy(() => import('@/features/member/pages/MemberMessagesPage').then((m) => ({ default: m.MemberMessagesPage })))
const MemberAnalyticsPage = lazy(() => import('@/features/member/pages/MemberAnalyticsPage').then((m) => ({ default: m.MemberAnalyticsPage })))
const MemberTemplatesPage = lazy(() => import('@/features/member/pages/MemberTemplatesPage').then((m) => ({ default: m.MemberTemplatesPage })))
const MemberWebhooksPage = lazy(() => import('@/features/member/pages/MemberWebhooksPage').then((m) => ({ default: m.MemberWebhooksPage })))
const AccountsPage = lazy(() => import('@/features/accounts/pages/AccountsPage').then((m) => ({ default: m.AccountsPage })))
const WebhooksPage = lazy(() => import('@/features/webhooks/pages/WebhooksPage').then((m) => ({ default: m.WebhooksPage })))
const TemplatesPage = lazy(() => import('@/features/templates/pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })))
const BillingPage = lazy(() => import('@/features/billing/pages/BillingPage').then((m) => ({ default: m.BillingPage })))
const CircuitBreakersPage = lazy(() => import('@/features/circuit-breakers/pages/CircuitBreakersPage').then((m) => ({ default: m.CircuitBreakersPage })))
const DeadLettersPage = lazy(() => import('@/features/dead-letters/pages/DeadLettersPage').then((m) => ({ default: m.DeadLettersPage })))
const FraudFlagsPage = lazy(() => import('@/features/fraud/pages/FraudFlagsPage').then((m) => ({ default: m.FraudFlagsPage })))
const PlansPage = lazy(() => import('@/features/billing/pages/PlansPage').then((m) => ({ default: m.PlansPage })))
const FeatureCatalogPage = lazy(() => import('@/features/billing/pages/FeatureCatalogPage').then((m) => ({ default: m.FeatureCatalogPage })))
const BillingSettingsPage = lazy(() => import('@/features/billing/pages/BillingSettingsPage').then((m) => ({ default: m.BillingSettingsPage })))
const AdminSubscriptionsPage = lazy(() => import('@/features/billing/pages/AdminSubscriptionsPage').then((m) => ({ default: m.AdminSubscriptionsPage })))
const KycReviewPage = lazy(() => import('@/features/accounts/pages/KycReviewPage').then((m) => ({ default: m.KycReviewPage })))
const MemberUpgradePage = lazy(() => import('@/features/member/pages/MemberUpgradePage').then((m) => ({ default: m.MemberUpgradePage })))
const MemberPaymentRequestsPage = lazy(() => import('@/features/member/pages/MemberPaymentRequestsPage').then((m) => ({ default: m.MemberPaymentRequestsPage })))
const MemberSubscriptionRequestsPage = lazy(() => import('@/features/member/pages/MemberSubscriptionRequestsPage').then((m) => ({ default: m.MemberSubscriptionRequestsPage })))
const LandingPage = lazy(() => import('@/landing/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const ContactSalesPage = lazy(() => import('@/landing/pages/ContactSalesPage').then((m) => ({ default: m.ContactSalesPage })))

function LazyLoader({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
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
    path: '/',
    element: (
      <ErrorBoundary>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#030712]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>}>
          <LandingPage />
        </Suspense>
      </ErrorBoundary>
    ),
  },
  {
    path: '/home',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/contact-sales',
    element: (
      <ErrorBoundary>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#030712]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>}>
          <ContactSalesPage />
        </Suspense>
      </ErrorBoundary>
    ),
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Skeleton className="h-96 w-96 rounded-2xl" variant="rectangular" /></div>}>
              <LoginPage />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: '/register',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Skeleton className="h-96 w-96 rounded-2xl" variant="rectangular" /></div>}>
              <RegisterPage />
            </Suspense>
          </ErrorBoundary>
        ),
      },
    ],
  },
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      // Admin-only routes
      {
        element: <AdminRoute><Outlet /></AdminRoute>,
        children: [
          { path: 'dashboard', element: <LazyLoader><DashboardPage /></LazyLoader> },
          { path: 'accounts', element: <LazyLoader><AccountsPage /></LazyLoader> },
          { path: 'users', element: <LazyLoader><UsersPage /></LazyLoader> },
          { path: 'analytics', element: <LazyLoader><AnalyticsPage /></LazyLoader> },
          { path: 'bi', element: <LazyLoader><BIDashboardPage /></LazyLoader> },
          { path: 'webhooks', element: <LazyLoader><WebhooksPage /></LazyLoader> },
          { path: 'templates', element: <LazyLoader><TemplatesPage /></LazyLoader> },
          { path: 'circuit-breakers', element: <LazyLoader><CircuitBreakersPage /></LazyLoader> },
          { path: 'dead-letters', element: <LazyLoader><DeadLettersPage /></LazyLoader> },
          { path: 'fraud-flags', element: <LazyLoader><FraudFlagsPage /></LazyLoader> },
          { path: 'plans', element: <LazyLoader><PlansPage /></LazyLoader> },
          { path: 'feature-catalog', element: <LazyLoader><FeatureCatalogPage /></LazyLoader> },
          { path: 'billing-settings', element: <LazyLoader><BillingSettingsPage /></LazyLoader> },
          { path: 'admin/subscriptions', element: <LazyLoader><AdminSubscriptionsPage /></LazyLoader> },
          { path: 'kyc-reviews', element: <LazyLoader><KycReviewPage /></LazyLoader> },
        ],
      },
      // Shared routes (accessible to both admin and member)
      { path: 'billing', element: <LazyLoader><BillingPage /></LazyLoader> },
      { path: 'settings', element: <LazyLoader><SettingsPage /></LazyLoader> },
      // Member portal routes (accessible to all authenticated users)
      {
        element: <MemberRoute><Outlet /></MemberRoute>,
        children: [
          { path: 'member', element: <LazyLoader><MemberDashboardPage /></LazyLoader> },
          { path: 'member/devices', element: <LazyLoader><MemberDevicesPage /></LazyLoader> },
          { path: 'member/messages', element: <LazyLoader><MemberMessagesPage /></LazyLoader> },
          { path: 'member/analytics', element: <LazyLoader><MemberAnalyticsPage /></LazyLoader> },
          { path: 'member/templates', element: <LazyLoader><MemberTemplatesPage /></LazyLoader> },
          { path: 'member/webhooks', element: <LazyLoader><MemberWebhooksPage /></LazyLoader> },
          { path: 'member/upgrade', element: <LazyLoader><MemberUpgradePage /></LazyLoader> },
          { path: 'member/payment-requests', element: <LazyLoader><MemberPaymentRequestsPage /></LazyLoader> },
          { path: 'member/subscription-requests', element: <LazyLoader><MemberSubscriptionRequestsPage /></LazyLoader> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <NotFoundPage />
        </Suspense>
      </ErrorBoundary>
    ),
  },
]

export const router = createBrowserRouter(routes)
