import { useEffect } from 'react'

interface SEOData {
  title: string
  description: string
  ogImage?: string
  ogUrl?: string
  schema?: Record<string, unknown>
}

const DEFAULTS = {
  title: 'AeroXe Bee \u2014 Distributed SMS Gateway Platform',
  description:
    'Enterprise SMS delivery platform with real-time analytics and reliable message delivery. Self-hostable or managed SaaS.',
  ogImage: '/og-image.png',
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

function setJsonLd(data: Record<string, unknown>) {
  const id = 'seo-json-ld'
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

function removeJsonLd() {
  const el = document.getElementById('seo-json-ld')
  if (el) el.remove()
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

export function useSEO({ title, description, ogImage, ogUrl, schema }: SEOData) {
  useEffect(() => {
    const prevTitle = document.title
    const prevCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? ''

    document.title = title
    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:image', ogImage ?? DEFAULTS.ogImage)
    setMeta('og:image:width', '1200')
    setMeta('og:image:height', '630')
    setMeta('og:url', ogUrl ?? DEFAULTS.ogUrl)
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    setMeta('twitter:image', ogImage ?? DEFAULTS.ogImage)
    setMeta('description', description, 'name')

    const url = ogUrl ?? DEFAULTS.ogUrl
    if (url) setCanonical(url)

    if (schema) setJsonLd(schema)

    return () => {
      document.title = prevTitle
      setMeta('og:title', DEFAULTS.title)
      setMeta('og:description', DEFAULTS.description)
      setMeta('og:image', DEFAULTS.ogImage)
      setMeta('og:image:width', '1200')
      setMeta('og:image:height', '630')
      setMeta('og:url', DEFAULTS.ogUrl)
      setMeta('twitter:title', DEFAULTS.title)
      setMeta('twitter:description', DEFAULTS.description)
      setMeta('twitter:image', DEFAULTS.ogImage)
      setMeta('description', DEFAULTS.description, 'name')
      if (prevCanonical) setCanonical(prevCanonical)
      removeJsonLd()
    }
  }, [title, description, ogImage, ogUrl])
}
