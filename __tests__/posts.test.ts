/**
 * @jest-environment node
 *
 * A shared post on the store (19 Oct 2026): /p/<id> learns who posted and
 * when through one door, and NOTHING a member wrote. Any failure reads as
 * "not available". The two app-link files name the right apps.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rpc = jest.fn();

jest.mock('../coaches/supabase', () => ({
  __esModule: true,
  coachDatabase: () => ({ rpc }),
}));

import {
  androidOpenUrl,
  getPostTeaser,
  isPostId,
  postUrl,
  toTeaser,
} from '../coaches/posts';
import { t } from '../i18n';

const ID = 'a1000000-0000-4000-8000-000000000001';

beforeEach(() => rpc.mockReset());

describe('the teaser', () => {
  it('asks the one door, and returns only who and when', async () => {
    rpc.mockResolvedValue({
      data: [{ author_name: 'Mona Adel', author_avatar_url: 'https://x/a.webp', created_at: '2026-10-19T12:00:00Z' }],
      error: null,
    });

    const teaser = await getPostTeaser(ID);

    expect(rpc).toHaveBeenCalledWith('get_post_teaser_v1', { p_post_id: ID });
    expect(teaser).toEqual({
      authorName: 'Mona Adel',
      authorAvatarUrl: 'https://x/a.webp',
      createdAt: '2026-10-19T12:00:00Z',
    });
    expect(Object.keys(teaser!)).not.toContain('body');
  });

  it('a removed post (no row) is "not available"', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    expect(await getPostTeaser(ID)).toBeNull();
  });

  it('a database error is "not available", never an error page', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await getPostTeaser(ID)).toBeNull();
    rpc.mockRejectedValue(new Error('network'));
    expect(await getPostTeaser(ID)).toBeNull();
  });

  it('a malformed id never reaches the database', async () => {
    expect(await getPostTeaser('../../etc')).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
    expect(isPostId(ID)).toBe(true);
  });

  it('a row without a name is not a teaser', () => {
    expect(toTeaser({ author_name: '  ' })).toBeNull();
  });
});

describe('the links', () => {
  it('the shared address is the one the app opens', () => {
    expect(postUrl(ID)).toBe(`https://unlimited-sw.com/p/${ID}`);
  });

  it('on Android, "open in the app" is an intent link to this app', () => {
    expect(androidOpenUrl(ID)).toBe(
      `intent://unlimited-sw.com/p/${ID}#Intent;scheme=https;package=com.unlimitedsw.app;end`
    );
  });
});

describe('the app-link files', () => {
  const read = (name: string) =>
    JSON.parse(readFileSync(join(__dirname, '..', 'public', '.well-known', name), 'utf8'));

  it('Apple: the team and bundle of the live app, for /p/*', () => {
    const aasa = read('apple-app-site-association');
    expect(aasa.applinks.details[0].appIDs).toEqual(['B335MSN2N6.com.unlimitedsw.unlimited']);
    expect(aasa.applinks.details[0].components[0]['/']).toBe('/p/*');
  });

  it('Android: the live package', () => {
    const links = read('assetlinks.json');
    expect(links[0].target.package_name).toBe('com.unlimitedsw.app');
    expect(links[0].relation).toContain('delegate_permission/common.handle_all_urls');
  });
});

describe('the words', () => {
  it('every sentence exists in both languages', () => {
    for (const key of [
      'post.eyebrow', 'post.title', 'post.body', 'post.open', 'post.getAndroid',
      'post.getIos', 'post.alreadyHave', 'post.unavailableTitle', 'post.unavailableBody',
    ] as const) {
      expect(t('en', key)).toBeTruthy();
      expect(t('ar', key)).toBeTruthy();
      expect(t('ar', key)).not.toBe(t('en', key));
    }
    expect(t('en', 'post.title')).toContain('{name}');
    expect(t('ar', 'post.title')).toContain('{name}');
  });
});
