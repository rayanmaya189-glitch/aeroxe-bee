import { AnnouncementBar } from '../components/AnnouncementBar'
import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { Features } from '../components/Features'
import { ProductShowcase } from '../components/ProductShowcase'
import { AIFeatures } from '../components/AIFeatures'
import { Benefits } from '../components/Benefits'
import { Industries } from '../components/Industries'
import { CustomerSuccess } from '../components/CustomerSuccess'
import { Statistics } from '../components/Statistics'
import { Integrations } from '../components/Integrations'
import { SecurityCompliance } from '../components/SecurityCompliance'
import { ComparisonTable } from '../components/ComparisonTable'
import { Pricing } from '../components/Pricing'
import { Testimonials } from '../components/Testimonials'
import { VideoSection } from '../components/VideoSection'
import { FAQ } from '../components/FAQ'
import { CTABanner } from '../components/CTABanner'
import { Footer } from '../components/Footer'
import { ScrollToTop } from '../components/ScrollToTop'
import { CookieConsent } from '../components/CookieConsent'
import { FloatingNotifications } from '../components/FloatingNotifications'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712]">
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <ProductShowcase />
        <AIFeatures />
        <Benefits />
        <Industries />
        <CustomerSuccess />
        <Statistics />
        <Integrations />
        <SecurityCompliance />
        <ComparisonTable />
        <Pricing />
        <Testimonials />
        <VideoSection />
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
