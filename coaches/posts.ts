/**
 * ============================================================
 * unlimited-sw · coaches · posts.ts
 * JOB: what a shared post link (unlimited-sw.com/p/<id>) may tell a
 *      stranger — who posted it and when. Never the words, never the
 *      photos: community posts are for members (Hatem, 19 Oct 2026).
 * USED BY: app/p/[id]/page.tsx, app/ar/p/[id]/page.tsx.
 * DEPENDS ON: coaches/supabase.ts and the door get_post_teaser_v1
 *             (migration 20261019235100).
 * RULES: · one door, nothing else
 *        · any failure reads as "not available", never as an error page
 * ============================================================
 */
import { coachDatabase } from './supabase';

export interface PostTeaser {
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string | null;
}

/** The app's package and the address the post opens in, for the buttons. */
export const ANDROID_PACKAGE = 'com.unlimitedsw.app';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/** Set once the app is in the App Store; until then the button is hidden. */
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || null;

const POST_ID = /^[0-9a-fA-F-]{36}$/;

export function isPostId(id: string): boolean {
  return POST_ID.test(id);
}

/** The link a member shares — the one the app opens. */
export function postUrl(id: string): string {
  return `https://unlimited-sw.com/p/${id}`;
}

/**
 * On Android, "open in the app" is an intent link: the app if installed,
 * the Play Store if not. (An https link tapped on its own site never
 * leaves the browser, on either system.)
 */
export function androidOpenUrl(id: string): string {
  return `intent://unlimited-sw.com/p/${id}#Intent;scheme=https;package=${ANDROID_PACKAGE};end`;
}

export async function getPostTeaser(id: string): Promise<PostTeaser | null> {
  if (!isPostId(id)) return null;
  try {
    const { data, error } = await coachDatabase().rpc('get_post_teaser_v1', { p_post_id: id });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return toTeaser(data[0] as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** The door's row → the teaser. Pure, so a test can hand in a shape. */
export function toTeaser(row: Record<string, unknown>): PostTeaser | null {
  const name = typeof row.author_name === 'string' ? row.author_name.trim() : '';
  if (!name) return null;
  return {
    authorName: name,
    authorAvatarUrl: typeof row.author_avatar_url === 'string' ? row.author_avatar_url : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
  };
}
