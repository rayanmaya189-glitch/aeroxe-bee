import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#030712] p-4">
      {/* Background grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }} />
      <div className="absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[128px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative text-center"
      >
        <p className="text-8xl font-bold text-white/[0.06]">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-100">Page not found</h1>
        <p className="mt-2 text-sm text-gray-400">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/dashboard" className="mt-6 inline-block">
          <Button icon={<ArrowLeft className="h-4 w-4" />}>Back to Dashboard</Button>
        </Link>
      </motion.div>
    </div>
  )
}
