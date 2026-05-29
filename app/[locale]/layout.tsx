import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://logistic-six-alpha.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'FINDIT Logistic — Carga consolidada China → Panamá desde $180/m³',
    template: '%s · FINDIT Logistic',
  },
  description:
    'Consolida tu carga LCL de China a Panamá y ahorra hasta 40% vs un casillero. Precios dinámicos por volumen, pools cada 15 días, sin mínimos imposibles.',
  keywords: ['carga consolidada Panamá', 'importar de China a Panamá', 'LCL China Panamá', 'casillero Panamá', 'flete marítimo Panamá', 'consolidador de carga'],
  alternates: { canonical: '/', languages: { es: '/', en: '/en' } },
  openGraph: {
    type: 'website', siteName: 'FINDIT Logistic', locale: 'es_PA',
    title: 'FINDIT Logistic — Carga consolidada China → Panamá desde $180/m³',
    description: 'Ahorra hasta 40% vs un casillero consolidando tu carga en pools. China → Panamá.',
    url: SITE,
  },
  twitter: { card: 'summary_large_image', title: 'FINDIT Logistic', description: 'Carga consolidada China → Panamá desde $180/m³' },
  robots: { index: true, follow: true },
};

// Structured data — helps Google understand the business and show rich results
// (organic self-promotion). Organization + Service + FAQ.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'FINDIT Logistic',
      url: SITE,
      description: 'Consolidador de carga LCL China → Panamá con precios dinámicos por volumen.',
      areaServed: 'PA',
    },
    {
      '@type': 'Service',
      serviceType: 'Consolidación de carga marítima LCL China → Panamá',
      provider: { '@type': 'Organization', name: 'FINDIT Logistic' },
      areaServed: { '@type': 'Country', name: 'Panamá' },
      offers: { '@type': 'Offer', priceCurrency: 'USD', price: '180', description: 'Desde $180/m³ en pool lleno' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: '¿Cuánto cuesta importar de China a Panamá con FINDIT?',
          acceptedAnswer: { '@type': 'Answer', text: 'Desde $180/m³ en un pool lleno, hasta 40% menos que un casillero tradicional ($420/m³).' } },
        { '@type': 'Question', name: '¿Cómo funciona el precio dinámico?',
          acceptedAnswer: { '@type': 'Answer', text: 'Agrupamos cargas en pools de 10 días. Mientras más volumen y más temprano entras, mayor tu descuento.' } },
        { '@type': 'Question', name: '¿Hay volumen mínimo?',
          acceptedAnswer: { '@type': 'Answer', text: 'Desde 0.5 m³. No necesitas llenar un contenedor para acceder a tarifas de consolidación.' } },
      ],
    },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  if (!routing.locales.includes(locale as 'es' | 'en')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
