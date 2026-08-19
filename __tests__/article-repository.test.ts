/**
 * @jest-environment node
 *
 * The guides and reviews collections are meant to move to Supabase later, and
 * the plan for that is "rewrite one file per collection". That only holds while
 * the repository really is the only thing importing the Mongoose model.
 *
 * One `import ArticleModel` in a page is invisible until migration day, when it
 * becomes a search through the codebase. This test makes it a build failure on
 * the day it is written instead.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();

const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'coverage', 'public', '.netlify', 'dist',
]);

/** The model each repository is allowed to be the sole importer of. */
const OWNED_MODELS = [
  { model: 'models/article', owner: 'repositories/articleRepository.ts' },
  { model: 'models/review', owner: 'repositories/reviewRepository.ts' },
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;

    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

const sourceFiles = walk(ROOT);

describe.each(OWNED_MODELS)('$model isolation', ({ model, owner }) => {
  it(`is imported only by ${owner}`, () => {
    const importers = sourceFiles
      .filter(file => {
        const source = readFileSync(file, 'utf8');
        // Matches "@/models/article" and "../models/article" alike.
        return new RegExp(`from ['"][^'"]*${model.replace('/', '\\/')}['"]`).test(source);
      })
      .map(file => relative(ROOT, file))
      // The test itself names the models in strings, not imports, but be explicit.
      .filter(file => !file.startsWith('__tests__/'));

    expect(importers.sort()).toEqual([owner]);
  });
});

describe('repository API shape', () => {
  it('exposes only plain arguments, so Postgres can satisfy the same signatures', () => {
    const source = readFileSync(join(ROOT, 'repositories/articleRepository.ts'), 'utf8');

    // A Mongo operator in an exported signature is a Mongo concept escaping the
    // boundary — the caller would then be writing Mongo, not calling a repository.
    const exported = source.match(/export async function[^{]+/g) ?? [];
    for (const signature of exported) {
      expect(signature).not.toMatch(/\$(set|in|gte|lte|ne|or|and)/);
    }
  });

  it('returns plain objects, not Mongoose documents', () => {
    const source = readFileSync(join(ROOT, 'repositories/articleRepository.ts'), 'utf8');
    // toArticle() runs everything through JSON, which is what strips the
    // document wrapper. If that disappears, documents start leaking out.
    expect(source).toContain('JSON.parse(JSON.stringify(');
  });
});
