import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

const NOTIFICATIONS = [
  { name: 'Sarah M.', company: 'TechFlow', action: 'started a free trial' },
  { name: 'James K.', company: 'DataSync', action: 'upgraded to Enterprise' },
  { name: 'Priya R.', company: 'CloudBase', action: 'connected 50 devices' },
  { name: 'Marcus L.', company: 'ByteForge', action: 'sent 1M+ messages' },
  { name: 'Alex T.', company: 'CodeNest', action: 'activated AI routing' },
  { name: 'Chen W.', company: 'NetPulse', action: 'booked a demo' },
]

export function FloatingNotifications() {
  const [current, setCurrent] = useState(0)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setShow(true)
      setCurrent((prev) => (prev + 1) % NOTIFICATIONS.length)
      setTimeout(() => setShow(false), 4000)
    }, 12000)

    const initialTimer = setTimeout(() => {
      setShow(true)
      setTimeout(() => setShow(false), 4000)
    }, 8000)

    return () => {
      clearInterval(interval)
      clearTimeout(initialTimer)
    }
  }, [])

  const notification = NOTIFICATIONS[current]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: -40, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-6 z-40 hidden sm:block"
        >
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#111827]/90 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-300">
                <span className="font-semibold text-white">{notification?.name}</span>
                {' '}from{' '}
                <span className="font-medium text-white">{notification?.company}</span>
                {' '}{notification?.action}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
