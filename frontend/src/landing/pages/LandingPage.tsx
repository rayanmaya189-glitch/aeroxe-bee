import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { Features } from '../components/Features'
import { AIFeatures } from '../components/AIFeatures'
import { Benefits } from '../components/Benefits'
import { Integrations } from '../components/Integrations'
import { Pricing } from '../components/Pricing'
import { Testimonials } from '../components/Testimonials'
import { FAQ } from '../components/FAQ'
import { CTABanner } from '../components/CTABanner'
import { Footer } from '../components/Footer'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712]">
      <Navbar />
      <Hero />
      <Features />
      <AIFeatures />
      <Benefits />
      <Integrations />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTABanner />
      <Footer />
    </div>
  )
}
