'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  calculateClientPrice,
  formatCurrency,
  REFERENCE_PRICE,
  POOL_DURATION_DAYS,
} from '@/lib/pricing';
import JoinPoolModal from './JoinPoolModal';

export interface Pool {
  id: string;
  origin: string;
  destination: string;
  volumeM3: number;
  participants: number;
  currentDay: number;
  departureDate: string;
}

interface PoolCardProps {
  pool: Pool;
}

export default function PoolCard({ pool }: PoolCardProps) {
  const t = useTranslations('pool');
  const [showModal, setShowModal] = useState(false);

  const todayResult = calculateClientPrice(pool.currentDay, pool.volumeM3);
  const progressPct = Math.min(100, Math.round((pool.volumeM3 / 20) * 100));
  const dayProgressPct = Math.round((pool.currentDay / POOL_DURATION_DAYS) * 100);
  const daysLeft = POOL_DURATION_DAYS - pool.currentDay + 1;

  // Volume tier thresholds as % of 20m³ max
  const tierMarks = [5, 15, 20].map((m) => Math.min(100, Math.round((m / 20) * 100)));

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-600 px-5 py-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-blue-200">{t('origin')} → {t('destination')}</p>
              <h3 className="mt-0.5 text-lg font-bold">
                {pool.origin} → {pool.destination}
              </h3>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                {t('dayOf', { current: pool.currentDay, total: POOL_DURATION_DAYS })}
              </span>
              <p className="mt-1 text-xs text-blue-200">{daysLeft} {t('daysLeft')}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-4">
          {/* Price block */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-slate-500">{t('referencePrice')} *</p>
              <p className="text-3xl font-bold text-slate-900 leading-none">
                {formatCurrency(REFERENCE_PRICE)}
                <span className="text-base font-normal text-slate-500">/m³</span>
              </p>
            </div>

            {todayResult.distributableSavings > 0 ? (
              <div className="text-right">
                <p className="text-xs text-slate-500">{t('yourPriceToday')}</p>
                <p className="text-2xl font-bold text-emerald-600 leading-none">
                  {formatCurrency(todayResult.clientPrice)}
                  <span className="text-sm font-normal text-slate-500">/m³</span>
                </p>
                <p className="text-xs text-emerald-600 font-medium">
                  -{formatCurrency(todayResult.clientDiscount)} {t('discount')}
                </p>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-xs text-slate-500">{t('yourPriceToday')}</p>
                <p className="text-2xl font-bold text-slate-700 leading-none">
                  {formatCurrency(REFERENCE_PRICE)}
                  <span className="text-sm font-normal text-slate-500">/m³</span>
                </p>
                <p className="text-xs text-slate-400">{t('noSavingsYet')}</p>
              </div>
            )}
          </div>

          {/* Volume progress with tier markers */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{t('volume')}: <strong>{pool.volumeM3} m³</strong> · {pool.participants} {t('participants')}</span>
              <span className="text-emerald-600 font-medium">{t('moreVolumeMoreDiscount')}</span>
            </div>
            <div className="relative h-3 rounded-full bg-slate-100 overflow-visible">
              {/* Fill bar */}
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
              {/* Tier change markers */}
              {tierMarks.map((pct, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${pct}%` }}
                >
                  <div className="w-0.5 h-4 bg-slate-400 rounded-full" />
                </div>
              ))}
            </div>
            <div className="relative flex justify-between text-xs text-slate-400 mt-1">
              <span>0</span>
              <span className="absolute text-emerald-600 font-semibold" style={{ left: '25%', transform: 'translateX(-50%)' }}>5m³↓</span>
              <span className="absolute text-emerald-600 font-semibold" style={{ left: '75%', transform: 'translateX(-50%)' }}>15m³↓</span>
              <span>20m³+</span>
            </div>
          </div>

          {/* Day progress */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{t('poolProgress')}</span>
              <span>{t('dayOf', { current: pool.currentDay, total: POOL_DURATION_DAYS })}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${dayProgressPct}%` }}
              />
            </div>
          </div>

          {/* Reference note */}
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            <p className="text-xs text-amber-700">* {t('referenceNote')}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{t('departure')}:</span>{' '}
              {pool.departureDate}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              {t('joinPool')}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <JoinPoolModal
          pool={pool}
          clientPrice={todayResult.clientPrice}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
