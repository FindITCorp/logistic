'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  POOL_DURATION_DAYS,
  DEFAULT_VOLUME_TIERS,
  calculateClientPrice,
  formatCurrency,
  DEFAULT_REFERENCE_PRICE,
} from '@/lib/pricing';

export default function PricingTierTable() {
  const t = useTranslations('pricing');
  const [volumeM3, setVolumeM3] = useState(8);

  const days = Array.from({ length: POOL_DURATION_DAYS }, (_, i) => i + 1);
  const maxVol = 25;

  // Tier change points for slider markers
  const tierBreaks = DEFAULT_VOLUME_TIERS.filter((tier) => tier.minM3 > 0).map((tier) => tier.minM3);

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
          {DEFAULT_VOLUME_TIERS.map((tier) => {
            const discount = DEFAULT_REFERENCE_PRICE - tier.carrierRate;
            const active = volumeM3 >= tier.minM3 && (tier.maxM3 === null || volumeM3 < tier.maxM3);
            return (
              <div
                key={tier.minM3}
                className={`rounded-xl border p-3 text-center transition-colors ${
                  active
                    ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <p className="text-xs text-slate-500">
                  {tier.maxM3 ? `${tier.minM3}–${tier.maxM3} m³` : `+${tier.minM3} m³`}
                </p>
                <p className={`text-xl font-extrabold mt-1 ${active ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {formatCurrency(DEFAULT_REFERENCE_PRICE - discount)}/m³
                </p>
                <p className={`text-xs font-semibold mt-0.5 ${discount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {discount > 0 ? `${t('youSave')} $${discount}` : t('noSavings')}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Volume slider with tier markers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">{t('simulateVolume')}</label>
          <span className="font-mono text-sm font-bold text-slate-900">{volumeM3} m³</span>
        </div>
        <div className="relative pt-1 pb-5">
          <input
            type="range"
            min={0}
            max={maxVol}
            step={0.5}
            value={volumeM3}
            onChange={(e) => setVolumeM3(Number(e.target.value))}
            className="w-full accent-emerald-600"
          />
          {/* Tier break markers */}
          <div className="relative w-full h-0">
            {tierBreaks.map((vol) => {
              const pct = (vol / maxVol) * 100;
              const tier = DEFAULT_VOLUME_TIERS.find((t) => t.minM3 === vol);
              const discount = tier ? DEFAULT_REFERENCE_PRICE - tier.carrierRate : 0;
              return (
                <div
                  key={vol}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-px h-2 bg-emerald-500" />
                  <span className="text-xs text-emerald-700 font-semibold whitespace-nowrap">
                    {vol}m³ → ${DEFAULT_REFERENCE_PRICE - discount}/m³
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incentive message */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5 flex items-center gap-3">
          <span className="text-emerald-600 text-lg">📦</span>
          <p className="text-xs text-emerald-800 font-medium">
            {t('inviteMessage')}
          </p>
        </div>
      </div>

      {/* Day pricing table — no % column */}
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">{t('dayJoined')}</th>
              <th className="px-4 py-3 text-center">{t('yourDiscount')}</th>
              <th className="px-4 py-3 text-right">{t('yourPrice')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {days.map((day) => {
              const result = calculateClientPrice(day, volumeM3);
              const isBest = day === 1;
              const isFloor = day >= 9;

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
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono">
                    {result.clientDiscount > 0 ? (
                      <span className="text-emerald-600 font-semibold">-{formatCurrency(result.clientDiscount)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
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
        * {t('referenceNote2', { price: formatCurrency(DEFAULT_REFERENCE_PRICE) })}
      </p>
    </div>
  );
}
