import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/requireAdmin';
import { articleRepository } from '@/repositories/articleRepository';

interface Params {
  params: Promise<{ id: string }>;
}

const publishSchema = z.object({ isPublished: z.boolean() });

export async function GET(_request: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const article = await articleRepository.getById(id);

  if (!article) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, article });
}

/** Publish / unpublish. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const article = await articleRepository.setPublished(id, parsed.data.isPublished);
  if (!article) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, article });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const removed = await articleRepository.remove(id);

  if (!removed) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
