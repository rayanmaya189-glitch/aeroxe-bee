import { Zap } from 'lucide-react'

const FOOTER_LINKS = {
  Product: ['Features', 'Pricing', 'Integrations', 'API Docs', 'Changelog'],
  Solutions: ['Enterprise', 'SMS Gateway', 'Fleet Management', 'Analytics', 'AI Routing'],
  Resources: ['Documentation', 'Blog', 'Community', 'Support', 'Status'],
  Company: ['About', 'Careers', 'Contact', 'Security', 'Privacy'],
}

export function Footer() {
  return (
    <footer className="relative bg-[#030712] border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">AeroXe Bee</span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              AI-powered SMS delivery platform for the modern enterprise.
            </p>
            <div className="mt-6 flex gap-3">
              {['X', 'GH', 'LI', 'YT'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs font-bold text-gray-400 transition-all hover:border-white/[0.12] hover:text-white"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white">{title}</h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-gray-400 transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} AeroXe Bee. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((link) => (
              <a key={link} href="#" className="text-xs text-gray-500 transition-colors hover:text-gray-400">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
