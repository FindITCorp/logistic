/**
 * Dynamic Price Pooling Engine — OSPF analogy
 * El precio por m³ baja conforme entra más volumen al pool.
 * Tiers negociados con forwarders según volumen total al cierre.
 */

export interface PricingTier {
  minVolume: number;
  maxVolume: number;
  ratePerM3: number;
  label: string;
}

export const PRICING_TIERS: PricingTier[] = [
  { minVolume: 0, maxVolume: 2, ratePerM3: 280, label: "Básico" },
  { minVolume: 2, maxVolume: 4, ratePerM3: 230, label: "Estándar" },
  { minVolume: 4, maxVolume: 7, ratePerM3: 185, label: "Consolidado" },
  { minVolume: 7, maxVolume: 12, ratePerM3: 150, label: "Volumen" },
  { minVolume: 12, maxVolume: Infinity, ratePerM3: 120, label: "Premium" },
];

export const MARKET_RATE_DDP = 600;

export interface VolumeResult {
  volumeM3: number;
  weightM3: number;
  billableM3: number;
  method: "volume" | "weight";
}

export interface PricingResult {
  billableM3: number;
  currentTier: PricingTier;
  currentRatePerM3: number;
  totalAmount: number;
  savings: number;
  savingsPercent: number;
  marketTotal: number;
  nextTier: PricingTier | null;
  volumeToNextTier: number | null;
  savingsAtNextTier: number | null;
}

export interface PoolPricingResult {
  poolVolume: number;
  currentTier: PricingTier;
  currentRatePerM3: number;
  nextTier: PricingTier | null;
  volumeToNextTier: number | null;
}

/** Estándar W/M: cobrar el mayor entre volumen real y peso volumétrico */
export function calculateBillableVolume(
  weightKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): VolumeResult {
  const volumeM3 = (lengthCm * widthCm * heightCm) / 1_000_000;
  const weightM3 = weightKg / 1000;
  const billableM3 = Math.max(volumeM3, weightM3);
  return {
    volumeM3,
    weightM3,
    billableM3,
    method: volumeM3 >= weightM3 ? "volume" : "weight",
  };
}

export function getTierForVolume(poolVolumeM3: number): PricingTier {
  return (
    PRICING_TIERS.find(
      (t) => poolVolumeM3 >= t.minVolume && poolVolumeM3 < t.maxVolume
    ) ?? PRICING_TIERS[PRICING_TIERS.length - 1]
  );
}

export function getNextTier(currentTier: PricingTier): PricingTier | null {
  const idx = PRICING_TIERS.indexOf(currentTier);
  return idx < PRICING_TIERS.length - 1 ? PRICING_TIERS[idx + 1] : null;
}

export function calculateShipmentPrice(
  billableM3: number,
  poolVolumeM3: number
): PricingResult {
  const currentTier = getTierForVolume(poolVolumeM3);
  const currentRatePerM3 = currentTier.ratePerM3;
  const totalAmount = billableM3 * currentRatePerM3;
  const marketTotal = billableM3 * MARKET_RATE_DDP;
  const savings = marketTotal - totalAmount;
  const savingsPercent = (savings / marketTotal) * 100;

  const nextTier = getNextTier(currentTier);
  const volumeToNextTier = nextTier
    ? Math.max(0, nextTier.minVolume - poolVolumeM3)
    : null;
  const savingsAtNextTier = nextTier
    ? marketTotal - billableM3 * nextTier.ratePerM3
    : null;

  return {
    billableM3,
    currentTier,
    currentRatePerM3,
    totalAmount,
    savings,
    savingsPercent,
    marketTotal,
    nextTier,
    volumeToNextTier,
    savingsAtNextTier,
  };
}

export function calculatePoolPricing(poolVolumeM3: number): PoolPricingResult {
  const currentTier = getTierForVolume(poolVolumeM3);
  const nextTier = getNextTier(currentTier);
  const volumeToNextTier = nextTier
    ? Math.max(0, nextTier.minVolume - poolVolumeM3)
    : null;

  return {
    poolVolume: poolVolumeM3,
    currentTier,
    currentRatePerM3: currentTier.ratePerM3,
    nextTier,
    volumeToNextTier,
  };
}

/** Distribución del ahorro según día de entrada al pool (días 1-10) */
export function savingsDistribution(dayOfEntry: number): number {
  const clampedDay = Math.max(1, Math.min(10, dayOfEntry));
  return 1 - (clampedDay - 1) * 0.09;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatVolume(m3: number): string {
  return `${m3.toFixed(3)} m³`;
}
