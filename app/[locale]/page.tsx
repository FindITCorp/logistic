import { useTranslations } from 'next-intl';
import Header from '@/components/Header';
import PoolCard, { Pool } from '@/components/PoolCard';
import PricingTierTable from '@/components/PricingTierTable';

const MOCK_POOLS: Pool[] = [
  {
    id: '1',
    origin: 'Shanghai',
    destination: 'Colón',
    referencePrice: 450,
    currentBulkPrice: 380,
    volumeM3: 14.5,
    participants: 9,
    daysActive: 12,
    departureDate: '2026-06-15',
  },
  {
    id: '2',
    origin: 'Guangzhou',
    destination: 'Colón',
    referencePrice: 420,
    currentBulkPrice: 410,
    volumeM3: 4.2,
    participants: 3,
    daysActive: 4,
    departureDate: '2026-06-28',
  },
  {
    id: '3',
    origin: 'Shenzhen',
    destination: 'Colón',
    referencePrice: 480,
    currentBulkPrice: 350,
    volumeM3: 18.8,
    participants: 14,
    daysActive: 22,
    departureDate: '2026-06-10',
  },
];

function HeroSection() {
  const t = useTranslations('hero');
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 py-24 text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white" />
      </div>
      <div className="container relative text-center">
        <span className="inline-block rounded-full border border-blue-300/40 bg-white/10 px-4 py-1.5 text-sm font-medium text-blue-100 backdrop-blur-sm">
          {t('badge')}
        </span>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {t('title')}{' '}
          <span className="relative inline-block">
            <span className="relative z-10 text-emerald-300">{t('titleHighlight')}</span>
            <span className="absolute inset-x-0 bottom-1 h-3 -z-0 rounded bg-emerald-500/20" />
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100 leading-relaxed">
          {t('subtitle')}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#pools"
            className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-700 shadow-lg hover:bg-blue-50 transition-colors"
          >
            {t('cta')}
          </a>
          <a
            href="#how-it-works"
            className="rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            {t('ctaSecondary')}
          </a>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const t = useTranslations('howItWorks');
  const steps = [
    { key: 'step1', icon: '🚀' },
    { key: 'step2', icon: '📉' },
    { key: 'step3', icon: '💰' },
  ] as const;

  return (
    <section id="how-it-works" className="bg-slate-50 py-20">
      <div className="container">
        <h2 className="text-center text-3xl font-bold text-slate-900">{t('title')}</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map(({ key, icon }) => (
            <div key={key} className="rounded-2xl bg-white p-6 shadow-sm text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">
                {icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {t(`${key}Title` as any)}
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                {t(`${key}Desc` as any)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PoolsSection() {
  const t = useTranslations('pool');
  const mainPool = MOCK_POOLS[0];

  return (
    <section id="pools" className="py-20">
      <div className="container">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">{t('title')}</h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">{t('subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_POOLS.map((pool) => (
            <PoolCard key={pool.id} pool={pool} />
          ))}
        </div>

        <div className="mt-16">
          <PricingTierTable
            referencePrice={mainPool.referencePrice}
            currentSavingsPerM3={mainPool.referencePrice - mainPool.currentBulkPrice}
          />
        </div>
      </div>
    </section>
  );
}

function TransparencySection() {
  const t = useTranslations('transparency');
  const points = ['point1', 'point2', 'point3'] as const;

  return (
    <section className="bg-brand-900 py-20 text-white">
      <div className="container max-w-3xl text-center">
        <h2 className="text-3xl font-bold">{t('title')}</h2>
        <p className="mt-4 text-blue-200 leading-relaxed">{t('desc')}</p>
        <ul className="mt-8 space-y-3 text-left">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white font-bold">✓</span>
              <span className="text-blue-100">{t(p)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className="border-t border-slate-100 py-8">
      <div className="container flex flex-col items-center gap-2 text-center text-sm text-slate-500 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-700">
            <span className="text-xs font-bold text-white">F</span>
          </div>
          <span className="font-semibold text-slate-700">FINDIT Logistic</span>
          <span>— {t('tagline')}</span>
        </div>
        <p>© {new Date().getFullYear()} FINDIT. {t('rights')}.</p>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <PoolsSection />
        <TransparencySection />
      </main>
      <Footer />
    </>
  );
}
