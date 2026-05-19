export const POOL_DURATION_DAYS = 10;

// Default reference price (max the client ever pays) — matches LMA competitor's $285 all-in
// We use $285 as ceiling: if we can't beat that, we don't charge more
export const DEFAULT_REFERENCE_PRICE = 285;

// ─── Shipping mode selection ──────────────────────────────────────────────────

// 20ft container: ~25 CBM usable, mid-market ocean rate $2,000
// 40ft container: ~55 CBM usable, mid-market ocean rate $3,200
export const FCL_20FT_COST = 2000;   // USD ocean freight only
export const FCL_20FT_CAPACITY = 25; // CBM usable
export const FCL_40FT_COST = 3200;
export const FCL_40FT_CAPACITY = 55;

// LCL becomes uncompetitive vs FCL above this threshold
export const FCL_BREAKEVEN_M3 = 20; // conservative: 20 CBM → 20ft FCL at $100/m³ = $2,000

// Minimum volume per client entry (below this, forwarder charges 1 CBM minimum anyway)
export const MIN_ENTRY_M3 = 0.5;

export type ShippingMode = 'LCL' | 'FCL_20' | 'FCL_40';

export function selectShippingMode(poolVolumeM3: number): ShippingMode {
  if (poolVolumeM3 >= FCL_40FT_CAPACITY * 0.75) return 'FCL_40';
  if (poolVolumeM3 >= FCL_BREAKEVEN_M3) return 'FCL_20';
  return 'LCL';
}

/** Carrier cost per m³ for the optimal shipping mode at a given pool volume */
export function getCarrierCostByMode(poolVolumeM3: number): { mode: ShippingMode; costPerM3: number } {
  const mode = selectShippingMode(poolVolumeM3);
  if (mode === 'FCL_40') return { mode, costPerM3: FCL_40FT_COST / Math.max(poolVolumeM3, 1) };
  if (mode === 'FCL_20') return { mode, costPerM3: FCL_20FT_COST / Math.max(poolVolumeM3, 1) };
  // LCL: use volume tiers
  return { mode: 'LCL', costPerM3: getCarrierRate(poolVolumeM3) };
}

// ─── LCL volume tiers (what the forwarder charges us) ────────────────────────
// Based on real quotes: TJ-China Freight $30/CBM flat (confirmed Zoe)
// Conservative model uses $85-100/CBM until we have 3+ forwarder quotes

export interface VolumeTier {
  minM3: number;
  maxM3: number | null;
  carrierRate: number;
}

export const DEFAULT_VOLUME_TIERS: VolumeTier[] = [
  { minM3: 0,  maxM3: 5,    carrierRate: 100 },
  { minM3: 5,  maxM3: 15,   carrierRate: 92  },
  { minM3: 15, maxM3: 20,   carrierRate: 87  },
  { minM3: 20, maxM3: null, carrierRate: 82  }, // FCL territory starts here
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
  mode: ShippingMode;
  distributableSavings: number;
  savingsPct: number;
  clientDiscount: number;
  clientPrice: number;
  companyMargin: number;
}

/**
 * Calculate the price a client pays when joining on `dayJoined`
 * with the pool at `currentVolumeM3`.
 * Automatically selects LCL vs FCL based on pool volume.
 */
export function calculateClientPrice(
  dayJoined: number,
  currentVolumeM3: number,
  providerRates?: ProviderRate[],
  referencePrice: number = DEFAULT_REFERENCE_PRICE,
): ClientPriceResult {
  const { mode, costPerM3: carrierRateByMode } = getCarrierCostByMode(currentVolumeM3);
  // When provider rates are supplied (LCL only), use them; otherwise use mode-based cost
  const carrierRate = mode === 'LCL'
    ? getCarrierRate(currentVolumeM3, providerRates)
    : carrierRateByMode;

  const distributableSavings = Math.max(0, referencePrice - carrierRate);
  const savingsPct = getSavingsPct(dayJoined);
  const clientDiscount = distributableSavings * (savingsPct / 100);
  const clientPrice = referencePrice - clientDiscount;
  const companyMargin = clientPrice - carrierRate;

  return {
    referencePrice,
    carrierRate,
    mode,
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
