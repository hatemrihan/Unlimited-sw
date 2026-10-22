import type { Metadata } from 'next';

import DesktopDownload from '@/app/components/DesktopDownload';
import { t } from '@/i18n';
import { alternatesFor } from '@/lib/locale';

export const metadata: Metadata = {
  title: t('en', 'download.title'),
  description: t('en', 'download.body'),
  alternates: alternatesFor('/download', '/ar/download', 'en'),
};

export default function DownloadPage() {
  return <DesktopDownload locale="en" />;
}
