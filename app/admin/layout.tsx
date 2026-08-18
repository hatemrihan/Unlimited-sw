import SessionWrapper from '../../components/SessionWrapper';

/**
 * The only part of the site that has a session.
 *
 * `SessionProvider` used to wrap the entire application from the root layout,
 * which meant every anonymous shopper carried it: a `/api/auth/session` call on
 * mount, another every five minutes, and another every time they switched back
 * to the tab. A serverless invocation each, for people who will never log in
 * and have nothing to log in to — the storefront checks out as a guest.
 *
 * Only `/admin` has a signed-in state, so only `/admin` pays for one.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionWrapper>{children}</SessionWrapper>;
}
