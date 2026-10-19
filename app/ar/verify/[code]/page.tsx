import type { Metadata } from 'next';

import CertificateVerify from '@/app/components/CertificateVerify';
import { normaliseCode, verifyCertificate } from '@/coaches/certifications';
import { t } from '@/i18n';
import { alternatesFor } from '@/lib/locale';

interface Props {
  params: Promise<{ code: string }>;
}

/** The Arabic twin of /verify/[code]. Same door, same rules, other words. */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const safe = encodeURIComponent(normaliseCode(decodeURIComponent(code)));
  return {
    title: t('ar', 'verify.title'),
    robots: { index: false, follow: false },
    alternates: alternatesFor(`/verify/${safe}`, `/ar/verify/${safe}`, 'ar'),
  };
}

export default async function ArabicVerifyPage({ params }: Props) {
  const { code } = await params;
  const clean = normaliseCode(decodeURIComponent(code));
  const verdict = await verifyCertificate(clean);
  return <CertificateVerify code={clean} verdict={verdict} locale="ar" />;
}
