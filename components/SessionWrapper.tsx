"use client";

import { SessionProvider } from 'next-auth/react';

export default function SessionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      basePath="/api/auth"
      // No polling and no refetch on focus.
      //
      // Both existed to keep a session fresh that nothing here depends on
      // being fresh: `middleware.ts` re-checks the admin list on every request
      // to /admin, and `requireAdmin` re-checks it on every API call. The
      // client-side copy is for showing a name, and a name does not need
      // re-fetching every five minutes or every time the admin changes tab.
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}

