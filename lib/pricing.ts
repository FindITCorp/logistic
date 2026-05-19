export const POOL_DURATION_DAYS = 10;

// ─── Competitor market rates (real, verified May 2026) ────────────────────────
// Casillero Guangzhou→Panamá (real operator, Panama):
//   - Small cargo: $17/ft³ = $600/m³ equivalent
//   - ≥1 CBM:      $420/CBM  ← primary competitor benchmark
//   - Transit:     45–55 days, bi-weekly departures
// LMA Global Logistics (published rate, lmagloballogistics.net):
//   - $285/CBM warehouse-to-warehouse (no customs included)
//   - Transit: ~37 days
export const MARKET_RATE_CASILLERO = 420; // real Panama competitor, ≥1 CBM
export const MARKET_RATE_SMALL     = 600; // real Panama competitor, <1 CBM ($17/ft³)
export const MARKET_RATE_LMA       = 285; // LMA Global, sophisticated competitor

// FINDIT reference price: what we charge when pool is at minimum volume.
// Set at $285 (matches LMA) — we're already cheaper than casillero at $420.
// As pool fills, client price drops toward $180–230.
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

// ─── Panama fixed costs per pool shipment ────────────────────────────────────
// Amortized across pool volume, included in FINDIT's quoted price.
// Client pays variable taxes separately at cargo pickup.
//
// Fixed per pool (one consolidated declaration):
//   Customs broker (agente aduanal): ~$250
//   ANA administrative fee:           $70
//   Port handling (THC Colón):       ~$100
//   Total:                            $420
export const CUSTOMS_FIXED_PER_POOL = 420;
//
// Last-mile transport: Colón port → FINDIT warehouse in Tocumen (Panama City)
//   Cargo truck per pool shipment:   ~$200
//   (FINDIT owns/rents receiving space in Tocumen — no warehouse rental cost)
export const COLON_TO_TOCUMEN_TRANSPORT = 200;
//
// Total fixed overhead per pool: $620
// Per m³ at 10 m³: $62/m³ | at 15 m³: $41/m³ | at 20 m³: $31/m³
export const FIXED_OVERHEAD_PER_POOL = CUSTOMS_FIXED_PER_POOL + COLON_TO_TOCUMEN_TRANSPORT;
//
// Variable taxes the CLIENT pays at pickup (NOT included in FINDIT price):
//   Arancel (import duty): 0–15% of declared CIF value (varies by HS code)
//   ITBMS (Panama VAT):    7% of (CIF + arancel)
// Typical: ~$60–140/m³ depending on product type and declared value.

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

// ─── Profitability floor ─────────────────────────────────────────────────────
// FINDIT keeps a guaranteed minimum margin regardless of day joined.
// Set at 30% over carrier: ensures $30/m³ min at $100 carrier.
// Break-even at this floor: ~40-47 m³/month (3 pools × 13-15 m³).
export const FINDIT_MARGIN_FLOOR_PCT = 0.30;

// Max client price: 40% cheaper than the real competitor ($420 casillero).
// = $252/m³. Client always saves at least 40% vs casillero.
export const MAX_CLIENT_PRICE = Math.round(MARKET_RATE_CASILLERO * 0.60); // $252

// % of distributable savings that goes TO THE CLIENT by day joined.
// Day 1 = client gets 90% (early bird). Day 10 = client gets 10%.
export const DAY_CLIENT_SAVINGS_PCT: Record<number, number> = {
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

export function getClientSavingsPct(dayJoined: number): number {
  const day = Math.max(1, Math.min(POOL_DURATION_DAYS, dayJoined));
  return DAY_CLIENT_SAVINGS_PCT[day] ?? 10;
}

export interface ClientPriceResult {
  carrierRate: number;
  mode: ShippingMode;
  overheadPerM3: number;     // fixed pool overhead amortized per m³ (customs + Colón→Tocumen)
  totalCostPerM3: number;    // carrierRate + overheadPerM3 (FINDIT's real cost)
  finditFloor: number;       // guaranteed FINDIT margin (30% of carrier)
  minClientPrice: number;    // totalCost + finditFloor (absolute floor)
  maxClientPrice: number;    // max($252, minClientPrice) — always competitive
  distributableSavings: number;
  clientSavingsPct: number;
  clientDiscount: number;
  clientPrice: number;       // what client pays per m³
  finditMargin: number;      // FINDIT earns per m³ (clientPrice - totalCostPerM3)
  savingVsCompetitor: number;
  // Two-stage payment breakdown
  advancePerM3: number;      // client pays before pool departs (= carrierRate)
  finalPerM3: number;        // client pays at Tocumen pickup (= clientPrice - advancePerM3)
}

/**
 * Calculate the price a client pays when joining on `dayJoined`.
 *
 * Cost layers:
 *   carrierRate   — ocean freight (LCL or FCL amortized)
 *   overheadPerM3 — fixed pool costs (customs $420 + transport $200) ÷ pool volume
 *   finditFloor   — minimum FINDIT margin (30% of carrier)
 *
 * Two-stage payment:
 *   advance  = carrierRate × volume  (paid before departure from China)
 *   final    = (clientPrice - carrierRate) × volume  (paid at Tocumen pickup)
 */
export function calculateClientPrice(
  dayJoined: number,
  currentVolumeM3: number,
  providerRates?: ProviderRate[],
): ClientPriceResult {
  const { mode, costPerM3: carrierRateByMode } = getCarrierCostByMode(currentVolumeM3);
  const carrierRate = mode === 'LCL'
    ? getCarrierRate(currentVolumeM3, providerRates)
    : carrierRateByMode;

  const safeVolume     = Math.max(currentVolumeM3, 1);
  const overheadPerM3  = FIXED_OVERHEAD_PER_POOL / safeVolume;
  const totalCostPerM3 = carrierRate + overheadPerM3;
  const finditFloor    = carrierRate * FINDIT_MARGIN_FLOOR_PCT;
  const minClientPrice = totalCostPerM3 + finditFloor;
  // Cap is $252 OR minClientPrice if overhead pushes us above — client always covered
  const maxClientPrice     = Math.max(MAX_CLIENT_PRICE, minClientPrice);
  const distributableSavings = Math.max(0, maxClientPrice - minClientPrice);

  const clientSavingsPct   = getClientSavingsPct(dayJoined);
  const clientDiscount     = distributableSavings * (clientSavingsPct / 100);
  const clientPrice        = maxClientPrice - clientDiscount;
  const finditMargin       = clientPrice - totalCostPerM3;
  const savingVsCompetitor = MARKET_RATE_CASILLERO - clientPrice;

  const advancePerM3 = carrierRate;
  const finalPerM3   = clientPrice - advancePerM3;

  return {
    carrierRate,
    mode,
    overheadPerM3,
    totalCostPerM3,
    finditFloor,
    minClientPrice,
    maxClientPrice,
    distributableSavings,
    clientSavingsPct,
    clientDiscount,
    clientPrice,
    finditMargin,
    savingVsCompetitor,
    advancePerM3,
    finalPerM3,
  };
}

export function formatCurrency(value: number, decimals = 2): string {
  return `$${value.toFixed(decimals)}`;
}
