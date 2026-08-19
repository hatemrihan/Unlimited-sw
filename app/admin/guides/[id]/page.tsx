import { notFound } from 'next/navigation';

import GuideEditor from '../GuideEditor';
import { articleRepository } from '@/repositories/articleRepository';

export const metadata = { title: 'تحرير دليل', robots: { index: false, follow: false } };

/**
 * The page is a server component so the guide is read directly rather than
 * fetched from our own API — the same rule the rest of the app follows.
 * The editor itself is the client component.
 *
 * The route is under /admin, which middleware protects, and the API the editor
 * posts to guards itself with requireAdmin.
 */
export default async function EditGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await articleRepository.getById(id);

  if (!article) notFound();

  return <GuideEditor initial={article} />;
}
