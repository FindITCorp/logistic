import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const prefix = locale === 'es' ? '' : `/${locale}`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <a href={`${prefix}/`} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700">
            <span className="text-sm font-bold text-white">F</span>
          </div>
          <span className="font-bold text-slate-900">FINDIT</span>
          <span className="hidden text-sm text-slate-500 sm:block">Logistic</span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <a href={`${prefix}/#how-it-works`} className="hover:text-slate-900 transition-colors">
            {t('howItWorks')}
          </a>
          <a href={`${prefix}/pools`} className="hover:text-slate-900 transition-colors">
            {t('pools')}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <a
            href={`${prefix}/registro`}
            className="hidden rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors sm:block"
          >
            {t('signup')}
          </a>
        </div>
      </div>
    </header>
  );
}
