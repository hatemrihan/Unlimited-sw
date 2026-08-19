import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/requireAdmin';
import { articleRepository } from '@/repositories/articleRepository';
import { slugifyEn, slugifyAr } from '@/lib/slug';

/**
 * Admin guides API. Guarded by requireAdmin on every handler — middleware's
 * matcher covers /admin pages, not /api/admin routes, so each route guards
 * itself. __tests__/admin-routes-guarded.test.ts fails the build otherwise.
 */

const articleSchema = z.object({
  slug: z.string().optional(),
  slugAr: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  titleAr: z.string().optional().default(''),
  excerpt: z.string().max(300).optional().default(''),
  excerptAr: z.string().max(300).optional().default(''),
  bodyMd: z.string().optional().default(''),
  bodyMdAr: z.string().optional().default(''),
  coverImage: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  relatedProductIds: z.array(z.string()).optional().default([]),
  seoTitle: z.string().max(70).optional().default(''),
  seoTitleAr: z.string().max(70).optional().default(''),
  seoDescription: z.string().max(160).optional().default(''),
  seoDescriptionAr: z.string().max(160).optional().default(''),
  isPublished: z.boolean().optional().default(false),
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json({ success: true, articles: await articleRepository.listAll() });
  } catch (error) {
    console.error('[admin/guides] list failed:', error);
    return NextResponse.json({ success: false, error: 'Could not load guides' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const parsed = articleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid guide' },
      { status: 400 }
    );
  }

  // Generate the URL segments when left blank, and normalise typed ones — a
  // stray capital or space would otherwise produce a slug that never matches.
  const slug = slugifyEn(parsed.data.slug?.trim() || parsed.data.title);
  const slugAr = slugifyAr(parsed.data.slugAr?.trim() || parsed.data.titleAr || '') || slug;

  if (!slug) {
    return NextResponse.json({ success: false, error: 'Could not build a URL from that title' }, { status: 400 });
  }

  try {
    const article = await articleRepository.upsert({ ...parsed.data, slug, slugAr });
    return NextResponse.json({ success: true, article });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: 'That URL is already taken' }, { status: 409 });
    }
    console.error('[admin/guides] save failed:', error);
    return NextResponse.json({ success: false, error: 'Could not save guide' }, { status: 500 });
  }
}
