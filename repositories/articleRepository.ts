import dbConnect from '@/lib/mongodb';
import ArticleModel, { type Article } from '@/models/article';
import type { Locale } from '@/lib/locale';

/**
 * The only file in the codebase that talks to the articles collection.
 *
 * Everything else calls these four functions. That is the whole point: when the
 * guides move to Supabase, this file is rewritten and nothing else changes.
 * The API is therefore deliberately plain — no query objects, no Mongo
 * operators, no `.lean()` leaking out — because a Postgres implementation has to
 * be able to satisfy the same signatures.
 *
 * __tests__/article-repository.test.ts fails the build if any other file
 * imports models/article.
 */

export interface ArticleDto {
  slug: string;
  slugAr: string;
  title: string;
  titleAr?: string;
  excerpt?: string;
  excerptAr?: string;
  bodyMd?: string;
  bodyMdAr?: string;
  coverImage?: string;
  authorId?: string;
  tags?: string[];
  relatedProductIds?: string[];
  seoTitle?: string;
  seoTitleAr?: string;
  seoDescription?: string;
  seoDescriptionAr?: string;
  isPublished?: boolean;
}

/** Strips Mongo internals so callers never see a Mongoose document. */
function toArticle(doc: any): Article | null {
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc)) as Article;
}

/**
 * Published guides, newest first.
 *
 * `locale` filters out articles with no copy in that language — an Arabic
 * listing that links to an English-only guide is a dead end for the reader and
 * a thin page for Google.
 */
export async function listPublished(locale: Locale = 'en'): Promise<Article[]> {
  await dbConnect();

  const docs = await ArticleModel.find({ isPublished: true })
    .sort({ publishedAt: -1 })
    .lean();

  const articles = docs.map(toArticle).filter(Boolean) as Article[];

  return locale === 'ar'
    ? articles.filter(a => a.titleAr?.trim() && a.bodyMdAr?.trim())
    : articles.filter(a => a.title?.trim() && a.bodyMd?.trim());
}

/** One published guide by its URL segment in that language. */
export async function getBySlug(slug: string, locale: Locale = 'en'): Promise<Article | null> {
  await dbConnect();

  const field = locale === 'ar' ? 'slugAr' : 'slug';
  const doc = await ArticleModel.findOne({ [field]: slug, isPublished: true }).lean();

  return toArticle(doc);
}

/** Every guide, published or not — the admin list. */
export async function listAll(): Promise<Article[]> {
  await dbConnect();
  const docs = await ArticleModel.find({}).sort({ updatedAt: -1 }).lean();
  return docs.map(toArticle).filter(Boolean) as Article[];
}

/** One guide by id, regardless of publish state — the admin editor. */
export async function getById(id: string): Promise<Article | null> {
  await dbConnect();
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  return toArticle(await ArticleModel.findById(id).lean());
}

/**
 * Creates or updates a guide, keyed on the English slug.
 *
 * Upsert rather than separate create/update so the admin editor and any future
 * import script share one path — two paths is how the two drift apart.
 */
export async function upsert(dto: ArticleDto): Promise<Article> {
  await dbConnect();

  const doc = await ArticleModel.findOneAndUpdate(
    { slug: dto.slug },
    { $set: dto },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return toArticle(doc)!;
}

/**
 * Publishes or unpublishes a guide.
 *
 * `publishedAt` is stamped on first publish only. Re-stamping it on every
 * toggle would reorder the guides list every time somebody fixed a typo.
 */
export async function setPublished(id: string, isPublished: boolean): Promise<Article | null> {
  await dbConnect();
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;

  const existing = await ArticleModel.findById(id).lean();
  if (!existing) return null;

  const update: Record<string, unknown> = { isPublished };
  if (isPublished && !(existing as any).publishedAt) {
    update.publishedAt = new Date();
  }

  return toArticle(await ArticleModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean());
}

/** Removes a guide entirely. */
export async function remove(id: string): Promise<boolean> {
  await dbConnect();
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return false;
  const result = await ArticleModel.deleteOne({ _id: id });
  return result.deletedCount === 1;
}

export const articleRepository = {
  listPublished,
  getBySlug,
  listAll,
  getById,
  upsert,
  setPublished,
  remove,
};

export type { Article };
