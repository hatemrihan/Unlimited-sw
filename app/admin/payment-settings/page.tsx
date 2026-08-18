import PaymentSettingsPanel from '@/app/admin/sections/paymentSettings';

/**
 * The standalone payment settings screen.
 *
 * This page was a stub — an `<h1>` and nothing else — while the real controls
 * lived only inside the dashboard's tabbed section. But `utils/navItems.tsx`
 * links here, and one entry even opens it in a NEW TAB, so following that link
 * gave a blank page with a heading and no way to change anything.
 *
 * It now renders the same panel the dashboard does, so both routes into this
 * feature work and there is one implementation, not two.
 */
export const metadata = {
  title: 'Payment Settings',
  robots: { index: false, follow: false },
};

export default function PaymentSettingsPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <PaymentSettingsPanel />
      </div>
    </main>
  );
}
