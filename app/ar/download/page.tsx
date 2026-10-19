import type { Metadata } from 'next';

import DesktopDownload from '@/app/components/DesktopDownload';
import { t } from '@/i18n';
import { alternatesFor } from '@/lib/locale';

export const metadata: Metadata = {
  title: t('ar', 'download.title'),
  description: t('ar', 'download.body'),
  alternates: alternatesFor('/download', '/ar/download', 'ar'),
};

export default function ArabicDownloadPage() {
  return <DesktopDownload locale="ar" />;
}
