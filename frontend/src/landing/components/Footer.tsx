import { Zap, ArrowRight } from 'lucide-react'

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
        {/* Newsletter */}
        <div className="mb-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="mb-4 lg:mb-0">
            <h3 className="text-lg font-semibold text-white">Stay in the loop</h3>
            <p className="mt-1 text-sm text-gray-400">Get the latest product updates, engineering insights, and industry news.</p>
          </div>
          <form className="flex w-full max-w-md gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
            />
            <button className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110">
              Subscribe
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>
        </div>

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
