import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X } from 'lucide-react'

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('cookie-consent-dismissed')
    if (!dismissed) {
      const timer = setTimeout(() => setShow(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem('cookie-consent-dismissed', 'true')
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-6 right-6 z-50 sm:left-auto sm:right-6 sm:max-w-md"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-[#111827]/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                <Cookie className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">We value your privacy</h4>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">
                  We use cookies to enhance your experience, analyze site traffic, and personalize content. By clicking &ldquo;Accept&rdquo;, you agree to our use of cookies.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={dismiss}
                    className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/25"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={dismiss}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-medium text-gray-300 transition-all hover:bg-white/[0.08]"
                  >
                    Essential Only
                  </button>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:text-white"
                aria-label="Dismiss cookie notice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
