import { useLocation, Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'

export function AuthLayout() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Outlet />
      </PageTransition>
    </AnimatePresence>
  )
}
