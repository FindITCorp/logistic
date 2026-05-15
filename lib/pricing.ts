export const POOL_DURATION_DAYS = 10;

export const REFERENCE_PRICE = 100;

// Carrier bulk rates by volume tier (m³)
export interface VolumeTier {
  minM3: number;
  maxM3: number | null;
  carrierRate: number;
}

export const VOLUME_TIERS: VolumeTier[] = [
  { minM3: 0,  maxM3: 5,    carrierRate: 100 },
  { minM3: 5,  maxM3: 15,   carrierRate: 90  },
  { minM3: 15, maxM3: 20,   carrierRate: 85  },
  { minM3: 20, maxM3: null, carrierRate: 80  },
];

// Savings distribution % by day joined (1-indexed, days 8-10 floor at 20%)
export const DAY_SAVINGS_PCT: Record<number, number> = {
  1:  90,
  2:  76,
  3:  62,
  4:  50,
  5:  40,
  6:  32,
  7:  25,
  8:  20,
  9:  20,
  10: 20,
};

export function getCarrierRate(volumeM3: number): number {
  const tier = VOLUME_TIERS.slice().reverse().find((t) => volumeM3 >= t.minM3);
  return tier ? tier.carrierRate : VOLUME_TIERS[0].carrierRate;
}

export function getDistributableSavings(volumeM3: number): number {
  return REFERENCE_PRICE - getCarrierRate(volumeM3);
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
 * Calculate the price a client would pay if they join on `dayJoined`
 * with the pool currently at `currentVolumeM3`.
 */
export function calculateClientPrice(
  dayJoined: number,
  currentVolumeM3: number,
): ClientPriceResult {
  const carrierRate = getCarrierRate(currentVolumeM3);
  const distributableSavings = REFERENCE_PRICE - carrierRate;
  const savingsPct = getSavingsPct(dayJoined);
  const clientDiscount = distributableSavings * (savingsPct / 100);
  const clientPrice = REFERENCE_PRICE - clientDiscount;
  const companyMargin = clientPrice - carrierRate;

  return {
    referencePrice: REFERENCE_PRICE,
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
