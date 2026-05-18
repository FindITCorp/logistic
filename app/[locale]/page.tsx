import { useTranslations, useLocale } from 'next-intl';
import Header from '@/components/Header';
import LeadCaptureSection from '@/components/LeadCaptureSection';

function HeroSection() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const prefix = locale === 'es' ? '' : `/${locale}`;

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
            href={`${prefix}/pools`}
            className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-700 shadow-lg hover:bg-blue-50 transition-colors"
          >
            {t('cta')}
          </a>
          <a
            href={`${prefix}/#how-it-works`}
            className="rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            {t('ctaSecondary')}
          </a>
        </div>
      </div>
    </section>
  );
}

function ConceptSection() {
  const t = useTranslations('concept');

  return (
    <section className="py-16 bg-white">
      <div className="container max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">{t('title')}</h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* Visual example */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-slate-500 mb-6">
            {t('exampleTitle')}
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Solo */}
            <div className="rounded-xl bg-white border border-slate-200 p-5 text-center">
              <div className="text-3xl mb-2">👤</div>
              <p className="font-semibold text-slate-700">{t('alone')}</p>
              <p className="text-xs text-slate-400 mt-1">1–5 m³</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-3">$100</p>
              <p className="text-xs text-slate-500">{t('perM3')}</p>
            </div>

            {/* Pool medio */}
            <div className="rounded-xl bg-blue-50 border border-brand-200 p-5 text-center">
              <div className="text-3xl mb-2">👥</div>
              <p className="font-semibold text-brand-700">{t('smallPool')}</p>
              <p className="text-xs text-slate-400 mt-1">5–15 m³</p>
              <p className="text-3xl font-extrabold text-brand-700 mt-3">$91–95</p>
              <p className="text-xs text-slate-500">{t('perM3')}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">{t('save')} $5–9</p>
            </div>

            {/* Pool grande */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center">
              <div className="text-3xl mb-2">🚢</div>
              <p className="font-semibold text-emerald-700">{t('fullPool')}</p>
              <p className="text-xs text-slate-400 mt-1">+20 m³</p>
              <p className="text-3xl font-extrabold text-emerald-700 mt-3">$82–98</p>
              <p className="text-xs text-slate-500">{t('perM3')}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">{t('save')} $2–18</p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            * {t('exampleNote')}
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const t = useTranslations('howItWorks');
  const locale = useLocale();
  const prefix = locale === 'es' ? '' : `/${locale}`;
  const steps = [
    { key: 'step1', icon: '🚀', color: 'bg-blue-50 text-blue-600' },
    { key: 'step2', icon: '📉', color: 'bg-emerald-50 text-emerald-600' },
    { key: 'step3', icon: '💰', color: 'bg-amber-50 text-amber-600' },
  ] as const;

  return (
    <section id="how-it-works" className="bg-slate-50 py-20">
      <div className="container">
        <h2 className="text-center text-3xl font-bold text-slate-900">{t('title')}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map(({ key, icon, color }) => (
            <div key={key} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${color}`}>
                {icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {t(`${key}Title` as any)}
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                {t(`${key}Desc` as any)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <a
            href={`${prefix}/pools`}
            className="inline-block rounded-xl bg-brand-700 px-8 py-3.5 text-base font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            {t('cta')}
          </a>
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
        <ConceptSection />
        <HowItWorksSection />
        <LeadCaptureSection />
        <TransparencySection />
      </main>
      <Footer />
    </>
  );
}
