/**
 * @jest-environment node
 *
 * Slugs become permanent URLs. Once Google has indexed /product/floor-parallettes
 * and a customer has the link in WhatsApp, changing how the slug is generated
 * breaks both. These cases pin the rules down before any product is created.
 */
import { slugifyEn, slugifyAr, slugifyFor } from '../lib/slug';

describe('slugifyEn', () => {
  it('lowercases and kebab-cases a product name', () => {
    expect(slugifyEn('Floor Parallettes')).toBe('floor-parallettes');
  });

  it('drops punctuation instead of encoding it', () => {
    expect(slugifyEn('Wall-mounted pull-up bar + Wall-parallel bar'))
      .toBe('wall-mounted-pull-up-bar-wall-parallel-bar');
  });

  it('keeps digits', () => {
    expect(slugifyEn('Dip Bars 110 cm')).toBe('dip-bars-110-cm');
  });

  it('folds accents so one product cannot own two URLs', () => {
    expect(slugifyEn('Bär')).toBe(slugifyEn('Bar'));
  });

  it('never leaves a leading or trailing separator', () => {
    expect(slugifyEn('  ...Premium Dip Bars!  ')).toBe('premium-dip-bars');
  });

  it('returns empty for empty input rather than throwing', () => {
    expect(slugifyEn('')).toBe('');
  });
});

describe('slugifyAr', () => {
  it('keeps Arabic letters and joins words with hyphens', () => {
    expect(slugifyAr('عقلة حائط 110 سم')).toBe('عقلة-حائط-110-سم');
  });

  it('strips tashkeel, which is invisible in a URL', () => {
    // Same word, one written with diacritics. If these differed, a link typed
    // from the vowelled spelling would 404.
    expect(slugifyAr('مُتَوازي')).toBe(slugifyAr('متوازي'));
    expect(slugifyAr('مُتَوازي')).toBe('متوازي');
  });

  it('strips tatweel (the kashida stretch character)', () => {
    expect(slugifyAr('بارلـــيتس')).toBe('بارليتس');
  });

  it('removes punctuation, including Arabic punctuation', () => {
    expect(slugifyAr('إكسسوارات، وحلق جمباز!')).toBe('إكسسوارات-وحلق-جمباز');
  });

  it('folds Arabic-Indic digits to ASCII so ١١٠ and 110 agree', () => {
    expect(slugifyAr('عقلة ١١٠ سم')).toBe('عقلة-110-سم');
    expect(slugifyAr('عقلة ١١٠ سم')).toBe(slugifyAr('عقلة 110 سم'));
  });

  it('never leaves a leading or trailing separator', () => {
    expect(slugifyAr('  متوازي  ')).toBe('متوازي');
  });
});

describe('slugifyFor', () => {
  it('routes to the right language', () => {
    expect(slugifyFor('en', 'Floor Parallettes')).toBe('floor-parallettes');
    expect(slugifyFor('ar', 'بارليتس أرضي')).toBe('بارليتس-أرضي');
  });

  it('falls back when there is no Arabic name yet', () => {
    // Arabic copy arrives after the products exist (owner task 2.11), so until
    // then the Arabic route has to resolve to something.
    expect(slugifyFor('ar', '', 'floor-parallettes')).toBe('floor-parallettes');
  });
});
