export interface PricingTier {
  minDays: number;
  maxDays: number | null;
  savingsPercentage: number;
}

export const PRICING_TIERS: PricingTier[] = [
  { minDays: 0,  maxDays: 2,    savingsPercentage: 0  },
  { minDays: 3,  maxDays: 4,    savingsPercentage: 15 },
  { minDays: 5,  maxDays: 9,    savingsPercentage: 50 },
  { minDays: 10, maxDays: 39,   savingsPercentage: 90 },
  { minDays: 40, maxDays: null, savingsPercentage: 30 },
];

export function getSavingsPercentage(daysInPool: number): number {
  if (daysInPool >= 40) return 30;
  if (daysInPool >= 10) return 90;
  if (daysInPool >= 5)  return 50;
  if (daysInPool >= 3)  return 15;
  return 0;
}

export interface PriceResult {
  referencePrice: number;
  bulkPrice: number;
  totalSavingsPerM3: number;
  userSavingsPerM3: number;
  companyMarginPerM3: number;
  userPrice: number;
  savingsPercentage: number;
}

export function calculateUserPrice(
  referencePrice: number,
  bulkPrice: number,
  daysInPool: number,
): PriceResult {
  const totalSavingsPerM3 = referencePrice - bulkPrice;
  const savingsPercentage = getSavingsPercentage(daysInPool);
  const userSavingsPerM3 = totalSavingsPerM3 * (savingsPercentage / 100);
  const companyMarginPerM3 = totalSavingsPerM3 - userSavingsPerM3;
  const userPrice = referencePrice - userSavingsPerM3;

  return {
    referencePrice,
    bulkPrice,
    totalSavingsPerM3,
    userSavingsPerM3,
    companyMarginPerM3,
    userPrice,
    savingsPercentage,
  };
}

export function formatCurrency(value: number, decimals = 2): string {
  return `$${value.toFixed(decimals)}`;
}
