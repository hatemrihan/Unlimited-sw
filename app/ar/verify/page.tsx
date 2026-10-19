import { redirect } from 'next/navigation';

import { certificateVerifyPath, normaliseCode } from '@/coaches/certifications';

interface Props {
  searchParams: Promise<{ code?: string }>;
}

/** The Arabic twin of /verify?code=… → /ar/verify/<code>. */
export const dynamic = 'force-dynamic';

export default async function ArabicVerifyIndex({ searchParams }: Props) {
  const { code } = await searchParams;
  redirect(certificateVerifyPath(normaliseCode(code ?? '') || '-', 'ar'));
}
