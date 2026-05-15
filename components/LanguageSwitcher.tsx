'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/navigation';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: 'es' | 'en') {
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1 text-sm">
      <button
        onClick={() => switchLocale('es')}
        className={`rounded px-2 py-0.5 font-medium transition-colors ${
          locale === 'es' ? 'bg-brand-700 text-white' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        ES
      </button>
      <button
        onClick={() => switchLocale('en')}
        className={`rounded px-2 py-0.5 font-medium transition-colors ${
          locale === 'en' ? 'bg-brand-700 text-white' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        EN
      </button>
    </div>
  );
}
