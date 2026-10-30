/**
 * English UI strings.
 *
 * A flat object, not an i18n library: there are ~70 strings and two languages,
 * and `t(locale, key)` with a typed key catches a missing translation at build
 * time — which is more than most libraries do at this size.
 *
 * `ar.ts` must have exactly these keys; __tests__/i18n.test.ts enforces it.
 */
export const en = {
  // ─── Navigation ───────────────────────────────────────────────────────────
  'nav.home': 'Home',
  'nav.shop': 'Shop',
  'nav.about': 'About',
  'nav.contact': 'Contact',
  'nav.guides': 'Guides',
  'nav.cart': 'Cart',
  'nav.language': 'العربية',
  'nav.languageAria': 'Switch to Arabic',

  // ─── Hero ─────────────────────────────────────────────────────────────────
  'hero.headline': 'WHERE IS ALL IN ONE PLACE\nSTRENGTH EQUIPMENT\nAND CALISTHENICS.',
  'hero.viewProducts': 'View Products',
  'hero.contactUs': 'Contact us',

  // ─── Shop ─────────────────────────────────────────────────────────────────
  'shop.title': 'Shop Collection',
  'shop.search': 'Search products…',
  'shop.all': 'All',
  'shop.empty': 'No products found matching your criteria.',
  'shop.loadError': 'Failed to load products',

  // ─── Product ──────────────────────────────────────────────────────────────
  'product.addToCart': 'Add to cart',
  'product.outOfStock': 'Out of stock',
  'product.preorder': 'Preorder',
  'product.related': 'Related products',
  'product.description': 'Description',
  'product.specifications': 'Specifications',
  'product.shipping': 'Shipping',
  'product.faqs': 'Frequently asked questions',
  'product.addedToCart': 'Added to cart',
  'product.off': 'OFF',
  'product.currency': 'EGP',
  'product.chooseVariant': 'Choose an option',

  // ─── Breadcrumbs ──────────────────────────────────────────────────────────
  'breadcrumb.home': 'Home',
  'breadcrumb.shop': 'Shop',

  // ─── Categories ───────────────────────────────────────────────────────────
  'category.inEgypt': 'in Egypt',
  'category.browseOthers': 'Browse other categories',
  'category.productsIn': 'Products in this category',

  // ─── Guides ───────────────────────────────────────────────────────────────
  'guides.title': 'Training guides',
  'guides.subtitle': 'Installation, technique and equipment advice from Dr. Mohamed Alkady.',
  'guides.readMore': 'Read the guide',
  'guides.empty': 'No guides published yet.',
  'guides.publishedOn': 'Published',
  'guides.by': 'By',

  // ─── Reviews ──────────────────────────────────────────────────────────────
  'reviews.title': 'Customer reviews',
  'reviews.empty': 'No reviews yet. Be the first.',
  'reviews.write': 'Write a review',
  'reviews.name': 'Your name',
  'reviews.rating': 'Rating',
  'reviews.text': 'Your review',
  'reviews.submit': 'Submit review',
  'reviews.thanks': 'Thank you — your review will appear once approved.',
  'reviews.basedOn': 'based on',
  'reviews.reviewsWord': 'reviews',

  // ─── Coaches ───────────────────────────────────────────────────
  // These strings dress facts the store does not own. The facts themselves are
  // listed in `coaches/schema.ts` → PROFILE_FIELDS, and the mobile app renders
  // the same list. A string added here for a fact the app does not show breaks
  // the parity rule; add it to both surfaces or to neither.
  'coach.breadcrumb': 'Coaches',
  'coach.notFound': 'Coach not found',
  'coach.programmes': 'Programmes',
  'coach.noProgrammes': 'No programmes published yet.',
  'coach.about': 'About',
  'coach.reviews': 'reviews',
  'coach.noRating': 'No reviews yet',
  'coach.followers': 'followers',
  'coach.accepting': 'Taking new athletes',
  'coach.notAccepting': 'Not taking new athletes right now',
  'coach.days': 'days',
  'coach.ctaTitle': 'Train with this coach',
  'coach.ctaBody': 'Coaching runs inside the Unlimited app — your plan, your check-ins, and a direct line to your coach.',
  'coach.ctaButton': 'Talk to us',
  'coach.headlineFallback': 'Calisthenics coach on Unlimited.',
  'coach.tick': 'Coach',
  'coach.sections': 'On this page',
  'coach.certificates': 'Certificates',
  'coach.rightNow': 'Right now',
  'coach.rating': 'Rating',
  'coach.community': 'Community',
  'coach.share': 'Share',
  'coach.linkCopied': 'Link copied',
  'coach.copyFailed': 'Could not copy the link',
  'coach.certifiedNumber': 'No.',
  'coach.level.beginner': 'Beginner',
  'coach.level.intermediate': 'Intermediate',
  'coach.level.advanced': 'Advanced',
  'coach.level.all': 'All levels',

  // ─── Certificates (courses, 19 Oct 2026) ──────────────────────────────────
  'verify.title': 'Certificate check',
  'verify.eyebrow': 'Unlimited Certified',
  'verify.validTitle': 'This certificate is valid',
  'verify.validBody': 'Issued by Unlimited after the holder finished the course and passed its exam.',
  'verify.expiredTitle': 'This certificate has expired',
  'verify.expiredBody': 'It was valid when issued; its validity period has ended.',
  'verify.revokedTitle': 'This certificate was revoked',
  'verify.revokedBody': 'It is no longer recognised by Unlimited.',
  'verify.unknownTitle': 'No certificate matches this code',
  'verify.unknownBody': 'Check the code on the certificate, or scan its QR again.',
  'verify.holder': 'Holder',
  'verify.course': 'Course',
  'verify.number': 'Certificate No.',
  'verify.issued': 'Issued',
  'verify.validUntil': 'Valid until',
  'verify.code': 'Code',
  'verify.checkAnother': 'Check another certificate',
  'verify.checkAction': 'Check',
  'verify.codePlaceholder': 'The code under the QR',
  'download.title': 'Unlimited for desktop',
  'download.body': 'Courses open on one phone and one desktop. The macOS and Windows apps are on their way; until they are published here, read on your phone.',
  'download.phone': 'Get the phone app',

  // ─── Footer ───────────────────────────────────────────────────────────────
  'footer.rights': 'All rights reserved.',
  'footer.terms': 'Terms',
  'footer.policy': 'Privacy policy',
  'footer.refund': 'Refunds',
  'footer.madeIn': 'Designed and made in Egypt.',

  // ─── Misc ─────────────────────────────────────────────────────────────────
  'common.whatsapp': 'Chat on WhatsApp',
  'common.loading': 'Loading…',
  'common.error': 'Something went wrong. Please try again.',

  // ─── A shared post (19 Oct 2026) ─────────────────────────────────────────
  'post.eyebrow': 'Unlimited community',
  'post.title': '{name} on Unlimited',
  'post.body': 'A post in the Unlimited community. Posts are for members — open it in the app.',
  'post.open': 'Open in the app',
  'post.getAndroid': 'Get it on Google Play',
  'post.getIos': 'Download on the App Store',
  'post.alreadyHave': 'Have the app? Tap the link from WhatsApp or Messages and it opens there.',
  'post.unavailableTitle': 'This post is not available',
  'post.unavailableBody': 'It may have been removed. Open Unlimited to see what is new.',
} as const;

export type StringKey = keyof typeof en;
