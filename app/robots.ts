import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://logistic-six-alpha.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/factura/'] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
