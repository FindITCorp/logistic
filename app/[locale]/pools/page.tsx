import { useTranslations } from 'next-intl';
import Header from '@/components/Header';
import PoolCard, { Pool } from '@/components/PoolCard';
import PricingTierTable from '@/components/PricingTierTable';

const MOCK_POOLS: Pool[] = [
  {
    id: '1',
    origin: 'Shanghai',
    destination: 'Colón',
    volumeM3: 8.5,
    participants: 6,
    currentDay: 3,
    departureDate: '2026-06-15',
  },
  {
    id: '2',
    origin: 'Guangzhou',
    destination: 'Colón',
    volumeM3: 2.1,
    participants: 2,
    currentDay: 1,
    departureDate: '2026-06-28',
  },
  {
    id: '3',
    origin: 'Shenzhen',
    destination: 'Colón',
    volumeM3: 16.4,
    participants: 11,
    currentDay: 7,
    departureDate: '2026-06-10',
  },
];

export default function PoolsPage() {
  const t = useTranslations('pool');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50">
        <div className="bg-gradient-to-r from-brand-900 to-brand-700 py-12 text-white">
          <div className="container">
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="mt-2 text-blue-200 max-w-xl">{t('subtitle')}</p>
          </div>
        </div>

        <div className="container py-12 space-y-12">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_POOLS.map((pool) => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
          </div>

          <PricingTierTable />
        </div>
      </main>
    </>
  );
}
