export const POOL_DURATION_DAYS = 10;

// Default reference price (max the client ever pays) — overridable per pool
export const DEFAULT_REFERENCE_PRICE = 100;

// Fallback static tiers — used when no provider is configured
export interface VolumeTier {
  minM3: number;
  maxM3: number | null;
  carrierRate: number;
}

export const DEFAULT_VOLUME_TIERS: VolumeTier[] = [
  { minM3: 0,  maxM3: 5,    carrierRate: 100 },
  { minM3: 5,  maxM3: 15,   carrierRate: 90  },
  { minM3: 15, maxM3: 20,   carrierRate: 85  },
  { minM3: 20, maxM3: null, carrierRate: 80  },
];

// Savings distribution % by day joined — linear -10%/day, floor 10%
export const DAY_SAVINGS_PCT: Record<number, number> = {
  1: 90, 2: 80, 3: 70, 4: 60, 5: 50,
  6: 40, 7: 30, 8: 20, 9: 10, 10: 10,
};

// ─── Provider-aware rate lookup ───────────────────────────────────────────────

export interface ProviderRate {
  min_volume_m3: number;
  max_volume_m3: number | null;
  rate_per_m3: number;
}

/**
 * Get the provider's cost for a given pool volume.
 * Falls back to the static default tiers when no provider rates are supplied.
 */
export function getCarrierRate(
  volumeM3: number,
  providerRates?: ProviderRate[],
): number {
  const tiers = providerRates && providerRates.length > 0
    ? providerRates.map(r => ({
        minM3: r.min_volume_m3,
        maxM3: r.max_volume_m3,
        carrierRate: r.rate_per_m3,
      }))
    : DEFAULT_VOLUME_TIERS;

  const match = tiers.slice().reverse().find(t => volumeM3 >= t.minM3);
  return match ? match.carrierRate : tiers[0].carrierRate;
}

export function getSavingsPct(dayJoined: number): number {
  const day = Math.max(1, Math.min(POOL_DURATION_DAYS, dayJoined));
  return DAY_SAVINGS_PCT[day] ?? 20;
}

export interface ClientPriceResult {
  referencePrice: number;
  carrierRate: number;
  distributableSavings: number;
  savingsPct: number;
  clientDiscount: number;
  clientPrice: number;
  companyMargin: number;
}

/**
 * Calculate the price a client pays when joining on `dayJoined`
 * with the pool at `currentVolumeM3`, using optional provider-specific rates
 * and an optional reference price override.
 */
export function calculateClientPrice(
  dayJoined: number,
  currentVolumeM3: number,
  providerRates?: ProviderRate[],
  referencePrice: number = DEFAULT_REFERENCE_PRICE,
): ClientPriceResult {
  const carrierRate = getCarrierRate(currentVolumeM3, providerRates);
  const distributableSavings = referencePrice - carrierRate;
  const savingsPct = getSavingsPct(dayJoined);
  const clientDiscount = distributableSavings * (savingsPct / 100);
  const clientPrice = referencePrice - clientDiscount;
  const companyMargin = clientPrice - carrierRate;

  return {
    referencePrice,
    carrierRate,
    distributableSavings,
    savingsPct,
    clientDiscount,
    clientPrice,
    companyMargin,
  };
}

export function formatCurrency(value: number, decimals = 2): string {
  return `$${value.toFixed(decimals)}`;
}
