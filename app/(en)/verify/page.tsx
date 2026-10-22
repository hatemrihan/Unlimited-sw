import { redirect } from 'next/navigation';

import { certificateVerifyPath, normaliseCode } from '@/coaches/certifications';

interface Props {
  searchParams: Promise<{ code?: string }>;
}

/**
 * /verify?code=… (the typed form) → /verify/<code>, so every check lands on
 * the one URL shape the QR uses. Without a code, the empty verdict page.
 */
export const dynamic = 'force-dynamic';

export default async function VerifyIndex({ searchParams }: Props) {
  const { code } = await searchParams;
  redirect(certificateVerifyPath(normaliseCode(code ?? '') || '-', 'en'));
}
