import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-4 dark:bg-surface-950">
      <p className="text-8xl font-bold text-surface-200 dark:text-surface-700">404</p>
      <h1 className="mt-4 text-2xl font-bold text-surface-900 dark:text-white">Page not found</h1>
      <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/dashboard" className="mt-6">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  )
}
