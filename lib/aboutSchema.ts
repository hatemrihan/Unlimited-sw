import type { Locale } from '@/lib/locale';

/**
 * Person + Organization data for the About page.
 *
 * This is the E-E-A-T signal (Phase 3, Task 3.6): Google weighs who is behind a
 * store, and a named founder with a stated qualification is the strongest thing
 * a small shop has. It only helps if it is true — every claim here comes from
 * the owner and should be corrected by him rather than embellished.
 *
 * `sameAs` is what links this person to their public profiles. Add the founder's
 * own accounts as they are supplied; a Person with no sameAs is an assertion
 * Google cannot corroborate.
 */
export function personJsonLd(locale: Locale) {
  const isArabic = locale === 'ar';

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: isArabic ? 'د. محمد القاضي' : 'Dr. Mohamed Alkady',
    jobTitle: isArabic ? 'المؤسس ومدرب كاليسثينكس' : 'Founder & Calisthenics Coach',
    description: isArabic
      ? 'دكتوراه في الميكانيكا الحيوية للتدريب الرياضي، وأكثر من ١٤ عاماً في تدريب الرياضيين. مؤسس Unlimited SW لتصنيع أجهزة الكاليسثينكس في مصر.'
      : 'Ph.D. in Biomechanics in Sports Training with over 14 years coaching athletes. Founder of Unlimited SW, which manufactures calisthenics equipment in Egypt.',
    url: isArabic ? 'https://unlimited-sw.com/ar/about' : 'https://unlimited-sw.com/about',
    knowsAbout: isArabic
      ? ['الكاليسثينكس', 'تدريب القوة', 'الميكانيكا الحيوية', 'تصنيع أجهزة رياضية']
      : ['Calisthenics', 'Strength training', 'Sports biomechanics', 'Fitness equipment manufacturing'],
    worksFor: {
      '@type': 'Organization',
      name: 'Unlimited SW',
      url: 'https://unlimited-sw.com',
      logo: 'https://unlimited-sw.com/logo.png',
    },
    // Add the founder's own profiles here as the owner supplies them.
    sameAs: [
      'https://www.instagram.com/unlimited_sw',
      'https://www.facebook.com/unlimited.sw',
    ],
  };
}
