import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { Features } from '../components/Features'
import { ProductShowcase } from '../components/ProductShowcase'
import { AIFeatures } from '../components/AIFeatures'
import { Benefits } from '../components/Benefits'
import { Statistics } from '../components/Statistics'
import { Integrations } from '../components/Integrations'
import { ComparisonTable } from '../components/ComparisonTable'
import { Pricing } from '../components/Pricing'
import { Testimonials } from '../components/Testimonials'
import { VideoSection } from '../components/VideoSection'
import { FAQ } from '../components/FAQ'
import { CTABanner } from '../components/CTABanner'
import { Footer } from '../components/Footer'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712]">
      <Navbar />
      <Hero />
      <Features />
      <ProductShowcase />
      <AIFeatures />
      <Benefits />
      <Statistics />
      <Integrations />
      <ComparisonTable />
      <Pricing />
      <Testimonials />
      <VideoSection />
      <FAQ />
      <CTABanner />
      <Footer />
    </div>
  )
}
