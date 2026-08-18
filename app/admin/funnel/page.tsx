import FunnelSection from '@/app/admin/sections/funnel';

/**
 * The standalone funnel screen.
 *
 * Renders the same component the dashboard tab does, following the pattern set
 * by payment-settings: two routes into one feature, one implementation. A
 * second copy of a report is how two screens start disagreeing about revenue.
 */
export const metadata = {
  title: 'Conversion Funnel',
  robots: { index: false, follow: false },
};

export default function FunnelPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <FunnelSection />
      </div>
    </main>
  );
}
