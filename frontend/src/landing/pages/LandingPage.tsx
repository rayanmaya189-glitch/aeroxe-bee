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

export function LandingPage() {
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
