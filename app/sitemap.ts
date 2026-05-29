import type { MetadataRoute } from 'next'
import { createServerClient } from '@/lib/supabase/client'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://logistic-six-alpha.vercel.app'

// Dynamic sitemap — static pages (ES + EN) plus every active pool, so Google
// indexes live pools and the site promotes itself organically.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ['', '/pools', '/registro', '/seguimiento', '/factura/estado']
  const now = new Date()

  const entries: MetadataRoute.Sitemap = []
  for (const path of staticPaths) {
    entries.push({ url: `${SITE}${path}`, lastModified: now, changeFrequency: 'daily', priority: path === '' ? 1 : 0.7 })
    entries.push({ url: `${SITE}/en${path}`, lastModified: now, changeFrequency: 'daily', priority: 0.5 })
  }

  try {
    const db = createServerClient()
    const { data: pools } = await db
      .from('pools')
      .select('pool_number')
      .eq('status', 'active')
    for (const p of pools ?? []) {
      entries.push({
        url: `${SITE}/pools/${p.pool_number}`,
        lastModified: now,
        changeFrequency: 'hourly',
        priority: 0.8,
      })
    }
  } catch {
    // DB unavailable — static entries still serve.
  }

  return entries
}
