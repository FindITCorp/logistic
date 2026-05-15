'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PRICING_TIERS, calculateUserPrice, formatCurrency } from '@/lib/pricing';

interface PricingTierTableProps {
  referencePrice: number;
  currentSavingsPerM3: number;
}

const TIER_KEYS = ['tier0Label', 'tier3Label', 'tier5Label', 'tier10Label', 'tier40Label'] as const;

export default function PricingTierTable({ referencePrice, currentSavingsPerM3 }: PricingTierTableProps) {
  const t = useTranslations('pricing');
  const [exampleSavings, setExampleSavings] = useState(currentSavingsPerM3);

  const bulkPrice = referencePrice - exampleSavings;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{t('title')}</h3>
      <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">{t('exampleDesc')}</label>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">$</span>
          <input
            type="number"
            min={1}
            max={referencePrice - 1}
            value={exampleSavings}
            onChange={(e) => setExampleSavings(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-slate-500 text-sm">{t('perM3')}</span>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">{t('daysInPool')}</th>
              <th className="px-4 py-3 text-center">{t('yourShare')}</th>
              <th className="px-4 py-3 text-center">{t('companyShare')}</th>
              <th className="px-4 py-3 text-right">{t('yourPrice')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {PRICING_TIERS.map((tier, i) => {
              const representativeDay = tier.minDays === 0 ? 1 : tier.minDays;
              const result = calculateUserPrice(referencePrice, bulkPrice, representativeDay);
              const isBest = tier.savingsPercentage === 90;

              return (
                <tr
                  key={tier.minDays}
                  className={`transition-colors ${isBest ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {t(TIER_KEYS[i])}
                    {isBest && (
                      <span className="ml-2 rounded-full bg-brand-700 px-2 py-0.5 text-xs text-white">
                        {t('bestDeal')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${isBest ? 'text-brand-700' : 'text-slate-700'}`}>
                      {tier.savingsPercentage}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">
                    {100 - tier.savingsPercentage}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(result.userPrice)}/m³
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        * {t('exampleDesc')} {formatCurrency(exampleSavings)} {t('perM3')} · Ref: {formatCurrency(referencePrice)}/m³
      </p>
    </div>
  );
}
