import type { Metadata } from 'next';

import CertificateVerify from '@/app/components/CertificateVerify';
import { normaliseCode, verifyCertificate } from '@/coaches/certifications';
import { t } from '@/i18n';
import { alternatesFor } from '@/lib/locale';

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * /verify/<code> — what the QR on an Unlimited certificate opens.
 *
 * NEVER CACHED. A certificate the head coach revoked a minute ago must
 * read "revoked" now; an hour of staleness here would be an hour in which
 * a revoked paper still verifies. The door is one primary-key read.
 *
 * NOT INDEXED. A verify page is for the person holding the certificate's
 * QR, not for search; indexing thousands of them would list every code.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const safe = encodeURIComponent(normaliseCode(decodeURIComponent(code)));
  return {
    title: t('en', 'verify.title'),
    robots: { index: false, follow: false },
    alternates: alternatesFor(`/verify/${safe}`, `/ar/verify/${safe}`, 'en'),
  };
}

export default async function VerifyPage({ params }: Props) {
  const { code } = await params;
  const clean = normaliseCode(decodeURIComponent(code));
  const verdict = await verifyCertificate(clean);
  return <CertificateVerify code={clean} verdict={verdict} locale="en" />;
}
