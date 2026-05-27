'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/pricing';
import type { Pool } from './PoolCard';

interface JoinPoolModalProps {
  pool: Pool;
  clientPrice: number;
  onClose: () => void;
}

export default function JoinPoolModal({ pool, clientPrice, onClose }: JoinPoolModalProps) {
  const t = useTranslations('join');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [volume, setVolume] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('required');
    if (!contact.trim()) e.contact = t('required');
    if (!volume || isNaN(Number(volume)) || Number(volume) <= 0) e.volume = t('volumeError');
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');

    try {
      // 1. Register the lead
      const isEmail = contact.includes('@');
      const leadRes = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          whatsapp: isEmail ? undefined : contact.trim(),
          email: isEmail ? contact.trim() : undefined,
          monthly_volume_m3: parseFloat(volume),
          origin_city: pool.origin,
          pool_id: pool.id,
          source: 'join_modal',
        }),
      });

      if (!leadRes.ok) {
        const d = await leadRes.json();
        throw new Error(d.error ?? 'Error al registrar');
      }

      setSubmitted(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-600 rounded-t-2xl px-6 py-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{t('title')}</h2>
              <p className="text-sm text-blue-200">{pool.origin} → {pool.destination}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-xl leading-none mt-0.5"
              aria-label={t('close')}
            >
              ✕
            </button>
          </div>
          <div className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-sm">
            <span className="text-blue-100">{t('priceToday')}: </span>
            <span className="font-bold text-emerald-300">{formatCurrency(clientPrice)}/m³</span>
          </div>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-4 space-y-3">
              <div className="text-5xl">✅</div>
              <h3 className="text-xl font-bold text-slate-800">{t('successTitle')}</h3>
              <p className="text-sm text-slate-500">{t('successDesc')}</p>
              <button
                onClick={onClose}
                className="mt-4 w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                {t('close')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('contact')}</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t('contactPlaceholder')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                {errors.contact && <p className="mt-1 text-xs text-red-500">{errors.contact}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('volume')}</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder={t('volumePlaceholder')}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">m³</span>
                </div>
                {errors.volume && <p className="mt-1 text-xs text-red-500">{errors.volume}</p>}
              </div>

              {apiError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {apiError}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : t('submit')}
              </button>

              <p className="text-xs text-center text-slate-400">{t('disclaimer')}</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
