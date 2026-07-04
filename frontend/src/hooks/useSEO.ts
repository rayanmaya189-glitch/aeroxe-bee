import { useEffect } from 'react'

interface SEOData {
  title: string
  description: string
  ogImage?: string
  ogUrl?: string
}

const DEFAULTS = {
  title: 'AeroXe Bee \u2014 Distributed SMS Gateway Platform',
  description:
    'Enterprise SMS delivery platform with intelligent multi-strategy routing, real-time analytics, and device fleet management. Self-hostable or managed SaaS.',
  ogImage: '/og-image.svg',
  ogUrl: 'https://aeroxbee.com',
}

function setMeta(property: string, content: string, attribute: 'name' | 'property' = 'property') {
  const selector = `${attribute}="${property}"`
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${selector}]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attribute, property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function useSEO({ title, description, ogImage, ogUrl }: SEOData) {
  useEffect(() => {
    const prevTitle = document.title
    const prevCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? ''

    document.title = title
    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:image', ogImage ?? DEFAULTS.ogImage)
    setMeta('og:url', ogUrl ?? DEFAULTS.ogUrl)
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    setMeta('twitter:image', ogImage ?? DEFAULTS.ogImage)
    setMeta('description', description, 'name')

    const url = ogUrl ?? DEFAULTS.ogUrl
    if (url) setCanonical(url)

    return () => {
      document.title = prevTitle
      setMeta('og:title', DEFAULTS.title)
      setMeta('og:description', DEFAULTS.description)
      setMeta('og:image', DEFAULTS.ogImage)
      setMeta('og:url', DEFAULTS.ogUrl)
      setMeta('twitter:title', DEFAULTS.title)
      setMeta('twitter:description', DEFAULTS.description)
      setMeta('twitter:image', DEFAULTS.ogImage)
      setMeta('description', DEFAULTS.description, 'name')
      if (prevCanonical) setCanonical(prevCanonical)
    }
  }, [title, description, ogImage, ogUrl])
}
