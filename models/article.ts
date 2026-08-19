import mongoose, { Schema } from 'mongoose';

/**
 * A guide (long-form article), in both languages in one document.
 *
 * SUPABASE-PORTABLE BY DESIGN. Every field is a scalar or an array of scalars —
 * no embedded documents, no Mongo-only operators, no ObjectId references except
 * the product ids, which are stored as plain strings. The whole shape maps to
 * one Postgres table with `text` and `text[]` columns.
 *
 * The body is Markdown rather than HTML or a block structure, for the same
 * reason: Markdown is a string in any database, renders anywhere, and survives a
 * migration untouched.
 *
 * Nothing outside repositories/articleRepository.ts may import this model.
 * That rule is what keeps the migration to one file instead of a search across
 * the codebase — __tests__/article-repository.test.ts enforces it.
 */
export interface Article {
  _id?: string;

  slug: string;
  slugAr: string;

  title: string;
  titleAr: string;
  excerpt: string;
  excerptAr: string;
  bodyMd: string;
  bodyMdAr: string;

  coverImage: string;
  authorId: string;
  tags: string[];
  relatedProductIds: string[];

  seoTitle: string;
  seoTitleAr: string;
  seoDescription: string;
  seoDescriptionAr: string;

  isPublished: boolean;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ArticleSchema = new Schema({
  // Unique so two guides cannot claim one URL. Not sparse: unlike the product
  // slugs, no article exists yet without one — the field is required from day one.
  slug:   { type: String, required: true, unique: true, trim: true },
  slugAr: { type: String, required: true, unique: true, trim: true },

  title:     { type: String, required: true, trim: true },
  titleAr:   { type: String, default: '', trim: true },
  excerpt:   { type: String, default: '' },
  excerptAr: { type: String, default: '' },
  bodyMd:    { type: String, default: '' },
  bodyMdAr:  { type: String, default: '' },

  coverImage: { type: String, default: '' },
  authorId:   { type: String, default: 'mohamed-alkady' },

  tags:              [{ type: String }],
  // Plain strings, not ObjectId refs: a ref is a Mongo concept, and this list is
  // only ever used to render product cards under the article.
  relatedProductIds: [{ type: String }],

  seoTitle:         { type: String, default: '' },
  seoTitleAr:       { type: String, default: '' },
  seoDescription:   { type: String, default: '' },
  seoDescriptionAr: { type: String, default: '' },

  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date },
}, { timestamps: true });

// The guides index: published only, newest first.
ArticleSchema.index({ isPublished: 1, publishedAt: -1 });

export default mongoose.models.Article || mongoose.model('Article', ArticleSchema);
