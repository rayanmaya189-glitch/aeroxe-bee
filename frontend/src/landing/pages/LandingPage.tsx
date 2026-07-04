import { AnnouncementBar } from '../components/AnnouncementBar'
import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { Features } from '../components/Features'
import { ProductEcosystem } from '../components/ProductEcosystem'
import { SmartRouting } from '../components/SmartRouting'
import { Statistics } from '../components/Statistics'
import { Integrations } from '../components/Integrations'
import { SecurityCompliance } from '../components/SecurityCompliance'
import { ArchitectureCredibility } from '../components/ArchitectureCredibility'
import { DeveloperSection } from '../components/DeveloperSection'
import { WhyChooseUs } from '../components/WhyChooseUs'
import { Testimonials } from '../components/Testimonials'
import { HowItWorks } from '../components/HowItWorks'
import { Pricing } from '../components/Pricing'
import { FAQ } from '../components/FAQ'
import { CTABanner } from '../components/CTABanner'
import { Footer } from '../components/Footer'
import { ScrollToTop } from '../components/ScrollToTop'
import { CookieConsent } from '../components/CookieConsent'
import { FloatingNotifications } from '../components/FloatingNotifications'
import { useSEO } from '@/hooks/useSEO'

export function LandingPage() {
  useSEO({
    title: 'AeroXe Bee — Distributed SMS Gateway Platform',
    description: 'Enterprise SMS delivery with intelligent multi-strategy routing, real-time analytics, device fleet management, and self-hosting options. Start free, scale as you grow.',
    ogImage: '/og-image.svg',
    ogUrl: 'https://aeroxbee.com',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'AeroXe Bee',
      url: 'https://aeroxbee.com',
      description: 'Enterprise SMS delivery platform with intelligent multi-strategy routing, real-time analytics, and device fleet management.',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://aeroxbee.com/?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  })

  return (
    <div className="min-h-screen bg-[#030712]">
      <div className="sticky top-0 z-50">
        <AnnouncementBar />
        <Navbar />
      </div>
      <main>
        <Hero />
        <Features />
        <ProductEcosystem />
        <SmartRouting />
        <Statistics />
        <Integrations />
        <SecurityCompliance />
        <ArchitectureCredibility />
        <DeveloperSection />
        <HowItWorks />
        <WhyChooseUs />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
      <ScrollToTop />
      <CookieConsent />
      <FloatingNotifications />
    </div>
  )
}
