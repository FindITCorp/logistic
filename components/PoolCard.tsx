import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/pricing';

export interface Pool {
  id: string;
  origin: string;
  destination: string;
  referencePrice: number;
  currentBulkPrice: number;
  volumeM3: number;
  participants: number;
  daysActive: number;
  departureDate: string;
}

interface PoolCardProps {
  pool: Pool;
}

export default function PoolCard({ pool }: PoolCardProps) {
  const t = useTranslations('pool');
  const savingsPerM3 = pool.referencePrice - pool.currentBulkPrice;
  const savingsPct = Math.round((savingsPerM3 / pool.referencePrice) * 100);
  const progressPct = Math.min(100, Math.round((pool.volumeM3 / 20) * 100));

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-brand-700 to-brand-600 px-5 py-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-blue-200">{t('origin')} → {t('destination')}</p>
            <h3 className="mt-0.5 text-lg font-bold">
              {pool.origin} → {pool.destination}
            </h3>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            {pool.daysActive} {t('daysActive')}
          </span>
        </div>
      </div>

      <div className="flex-1 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-500">{t('referencePrice')} *</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(pool.referencePrice)}
              <span className="text-base font-normal text-slate-500">/m³</span>
            </p>
          </div>
          {savingsPerM3 > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500">{t('currentSavings')}</p>
              <p className="text-xl font-bold text-emerald-600">
                -{formatCurrency(savingsPerM3)}
                <span className="text-sm font-normal text-slate-500">/m³</span>
              </p>
              <p className="text-xs text-emerald-600 font-medium">{savingsPct}% off</p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{t('volume')}: {pool.volumeM3} {t('m3')} · {pool.participants} {t('participants')}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
          <p className="text-xs text-amber-700">
            * {t('referenceNote')}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{t('departure')}:</span>{' '}
            {pool.departureDate}
          </div>
          <button className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
            {t('joinPool')}
          </button>
        </div>
      </div>
    </div>
  );
}
