'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  DAY_SAVINGS_PCT,
  POOL_DURATION_DAYS,
  VOLUME_TIERS,
  calculateClientPrice,
  formatCurrency,
  REFERENCE_PRICE,
} from '@/lib/pricing';

export default function PricingTierTable() {
  const t = useTranslations('pricing');
  const [volumeM3, setVolumeM3] = useState(8);

  const days = Array.from({ length: POOL_DURATION_DAYS }, (_, i) => i + 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{t('title')}</h3>
        <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>
      </div>

      {/* Volume tiers */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">{t('volumeTiersTitle')}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VOLUME_TIERS.map((tier) => {
            const savings = REFERENCE_PRICE - tier.carrierRate;
            const active = volumeM3 >= tier.minM3 && (tier.maxM3 === null || volumeM3 < tier.maxM3);
            return (
              <div
                key={tier.minM3}
                className={`rounded-xl border p-3 text-center transition-colors ${
                  active
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <p className="text-xs text-slate-500">
                  {tier.maxM3 ? `${tier.minM3}–${tier.maxM3} m³` : `>${tier.minM3} m³`}
                </p>
                <p className="text-lg font-bold text-slate-900">${tier.carrierRate}</p>
                <p className={`text-xs font-semibold ${savings > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {savings > 0 ? `-$${savings} ${t('savings')}` : t('noSavings')}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
          {t('simulateVolume')}:
        </label>
        <input
          type="range"
          min={0}
          max={25}
          step={0.5}
          value={volumeM3}
          onChange={(e) => setVolumeM3(Number(e.target.value))}
          className="flex-1 accent-brand-600"
        />
        <span className="w-16 text-right font-mono text-sm font-semibold text-slate-900">
          {volumeM3} m³
        </span>
      </div>

      {/* Day pricing table */}
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">{t('dayJoined')}</th>
              <th className="px-4 py-3 text-center">{t('yourShare')}</th>
              <th className="px-4 py-3 text-center">{t('yourDiscount')}</th>
              <th className="px-4 py-3 text-right">{t('yourPrice')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {days.map((day) => {
              const result = calculateClientPrice(day, volumeM3);
              const pct = DAY_SAVINGS_PCT[day];
              const isFloor = day >= 8;
              const isBest = day === 1;

              return (
                <tr
                  key={day}
                  className={`transition-colors ${
                    isBest ? 'bg-emerald-50' : isFloor ? 'bg-slate-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {t('day')} {day}
                    {isBest && (
                      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                        {t('bestDeal')}
                      </span>
                    )}
                    {isFloor && !isBest && (
                      <span className="ml-2 text-xs text-slate-400">{t('floor')}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`font-semibold ${isBest ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {pct}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono text-slate-600">
                    {result.clientDiscount > 0 ? `-${formatCurrency(result.clientDiscount)}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(result.clientPrice)}/m³
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        * {t('referenceNote2', { price: formatCurrency(REFERENCE_PRICE) })}
      </p>
    </div>
  );
}
