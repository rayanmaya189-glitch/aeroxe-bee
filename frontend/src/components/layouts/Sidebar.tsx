import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useIsMobile } from '@/hooks/useMediaQuery'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const IconDashboard = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
)

const IconAccounts = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
)

const IconUsers = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

const IconAnalytics = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)

const IconWebhooks = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-6.364-6.364L4.5 7.5l4.5 4.5" />
  </svg>
)

const IconTemplates = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)

const IconBilling = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
)

const IconCircuitBreakers = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
)

const IconDeadLetters = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
)

const IconFraudFlags = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
)

const IconSettings = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const IconDevices = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
)

const IconMessages = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
)

// ─── Nav Item Definitions ─────────────────────────────────────────────────

const adminItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: IconDashboard },
  { label: 'Accounts', path: '/accounts', icon: IconAccounts },
  { label: 'Users', path: '/users', icon: IconUsers },
  { label: 'Analytics', path: '/analytics', icon: IconAnalytics },
  { label: 'Webhooks', path: '/webhooks', icon: IconWebhooks },
  { label: 'Templates', path: '/templates', icon: IconTemplates },
  { label: 'Circuit Breakers', path: '/circuit-breakers', icon: IconCircuitBreakers },
  { label: 'Dead Letters', path: '/dead-letters', icon: IconDeadLetters },
  { label: 'Fraud Flags', path: '/fraud-flags', icon: IconFraudFlags },
]

// Shared items – accessible to both admins and members
const sharedItems: NavItem[] = [
  { label: 'Billing', path: '/billing', icon: IconBilling },
  { label: 'Settings', path: '/settings', icon: IconSettings },
]

const memberItems: NavItem[] = [
  { label: 'My Dashboard', path: '/member', icon: IconDashboard },
  { label: 'My Devices', path: '/member/devices', icon: IconDevices },
  { label: 'My Messages', path: '/member/messages', icon: IconMessages },
  { label: 'My Analytics', path: '/member/analytics', icon: IconAnalytics },
  { label: 'My Templates', path: '/member/templates', icon: IconTemplates },
  { label: 'My Webhooks', path: '/member/webhooks', icon: IconWebhooks },
]

// ─── NavItemLink Component ─────────────────────────────────────────────────

function NavItemLink({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
            : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200',
          isCollapsed && 'justify-center px-2',
        )
      }
    >
      {item.icon}
      {!isCollapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

// ─── Nav Section Component ─────────────────────────────────────────────────

function NavSection({
  label,
  items,
  isCollapsed,
}: {
  label: string
  items: NavItem[]
  isCollapsed: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-2">
      {!isCollapsed ? (
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
          {label}
        </p>
      ) : (
        <div className="mx-auto mb-2 h-px w-6 bg-surface-200 dark:bg-surface-700" />
      )}
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavItemLink key={item.path} item={item} isCollapsed={isCollapsed} />
        ))}
      </div>
    </div>
  )
}

// ─── Divider ───────────────────────────────────────────────────────────────

function Divider({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div
      className={cn('my-3', isCollapsed ? 'mx-auto h-px w-6' : 'mx-3 h-px')}
      style={{ backgroundColor: 'var(--color-surface-200, #e5e7eb)' }}
    />
  )
}

// ─── Main Sidebar Component ────────────────────────────────────────────────

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const user = useAuthStore((s) => s.user)
  const isMobile = useIsMobile()

  const isAdmin = user && user.role !== 'member'
  const showSidebar = isMobile ? sidebarOpen : true
  const isCollapsed = !sidebarOpen && !isMobile

  return (
    <>
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col border-r bg-white transition-all duration-300 dark:bg-surface-900 dark:border-surface-700',
          showSidebar ? 'translate-x-0' : '-translate-x-full',
          isMobile ? 'w-64' : sidebarOpen ? 'w-64' : 'w-16',
        )}
      >
        <div className={cn('flex h-16 items-center border-b border-surface-100 px-4 dark:border-surface-700', sidebarOpen || isMobile ? 'justify-between' : 'justify-center')}>
          {(sidebarOpen || isMobile) && (
            <span className="text-xl font-bold text-surface-900 dark:text-white">
              <span className="text-primary-600">AeroXe</span> Bee
            </span>
          )}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {/* Admin Section — only shown to admin/staff users */}
          {isAdmin && (
            <>
              <NavSection label="Admin" items={adminItems} isCollapsed={isCollapsed} />
              <Divider isCollapsed={isCollapsed} />
            </>
          )}

          {/* Member Section — shown to all authenticated users */}
          <NavSection label="Member Portal" items={memberItems} isCollapsed={isCollapsed} />

          {/* Shared Section — accessible to all users */}
          <Divider isCollapsed={isCollapsed} />
          <NavSection label="Account" items={sharedItems} isCollapsed={isCollapsed} />
        </nav>

        <div className={cn('border-t border-surface-100 p-3 dark:border-surface-700', isCollapsed && 'text-center')}>
          {(sidebarOpen || isMobile) && (
            <p className="text-xs text-surface-400 dark:text-surface-500">&copy; 2026 Aeroxe Enterprises Pvt. Ltd.</p>
          )}
        </div>
      </aside>
    </>
  )
}
