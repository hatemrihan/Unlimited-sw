import type { StringKey } from './en';

/**
 * Arabic UI strings — Egyptian Modern Standard Arabic.
 *
 * DRAFT: written to unblock the Arabic routes. Dr. Alkady / Hatem should read
 * these through before launch — particularly the equipment names, where the
 * word customers actually search for matters more than the formally correct
 * translation. "عقلة" and "متوازي" are the gym-floor words, chosen over the
 * literal "بار العقلة" / "قضبان متوازية" for that reason.
 *
 * Typed as Record<StringKey, string>, so removing a key here is a build error.
 */
export const ar: Record<StringKey, string> = {
  // ─── Navigation ───────────────────────────────────────────────────────────
  'nav.home': 'الرئيسية',
  'nav.shop': 'المتجر',
  'nav.about': 'من نحن',
  'nav.contact': 'تواصل معنا',
  'nav.guides': 'أدلة التدريب',
  'nav.cart': 'السلة',
  'nav.language': 'English',
  'nav.languageAria': 'التبديل إلى الإنجليزية',

  // ─── Hero ─────────────────────────────────────────────────────────────────
  'hero.headline': 'كل ما تحتاجه في مكان واحد\nأجهزة قوة\nوكاليسثينكس.',
  'hero.viewProducts': 'تصفح المنتجات',
  'hero.contactUs': 'تواصل معنا',

  // ─── Shop ─────────────────────────────────────────────────────────────────
  'shop.title': 'تصفح المنتجات',
  'shop.search': 'ابحث عن منتج…',
  'shop.all': 'الكل',
  'shop.empty': 'لا توجد منتجات مطابقة لبحثك.',
  'shop.loadError': 'تعذر تحميل المنتجات',

  // ─── Product ──────────────────────────────────────────────────────────────
  'product.addToCart': 'أضف إلى السلة',
  'product.outOfStock': 'غير متوفر',
  'product.preorder': 'حجز مسبق',
  'product.related': 'منتجات ذات صلة',
  'product.description': 'الوصف',
  'product.specifications': 'المواصفات',
  'product.shipping': 'الشحن',
  'product.faqs': 'الأسئلة الشائعة',
  'product.addedToCart': 'تمت الإضافة إلى السلة',
  'product.off': 'خصم',
  'product.currency': 'جنيه',
  'product.chooseVariant': 'اختر النوع',

  // ─── Breadcrumbs ──────────────────────────────────────────────────────────
  'breadcrumb.home': 'الرئيسية',
  'breadcrumb.shop': 'المتجر',

  // ─── Categories ───────────────────────────────────────────────────────────
  'category.inEgypt': 'في مصر',
  'category.browseOthers': 'تصفح باقي الأقسام',
  'category.productsIn': 'منتجات هذا القسم',

  // ─── Guides ───────────────────────────────────────────────────────────────
  'guides.title': 'أدلة التدريب',
  'guides.subtitle': 'نصائح في التركيب والأداء واختيار الأجهزة من د. محمد القاضي.',
  'guides.readMore': 'اقرأ الدليل',
  'guides.empty': 'لا توجد أدلة منشورة بعد.',
  'guides.publishedOn': 'نُشر في',
  'guides.by': 'بقلم',

  // ─── Reviews ──────────────────────────────────────────────────────────────
  'reviews.title': 'آراء العملاء',
  'reviews.empty': 'لا توجد آراء بعد. كن أول من يكتب.',
  'reviews.write': 'اكتب رأيك',
  'reviews.name': 'الاسم',
  'reviews.rating': 'التقييم',
  'reviews.text': 'رأيك',
  'reviews.submit': 'إرسال',
  'reviews.thanks': 'شكراً لك — سيظهر رأيك بعد المراجعة.',
  'reviews.basedOn': 'بناءً على',
  'reviews.reviewsWord': 'تقييم',

  // ─── Coaches ───────────────────────────────────────────────────
  'coach.breadcrumb': 'المدربون',
  'coach.notFound': 'المدرب غير موجود',
  'coach.programmes': 'البرامج',
  'coach.noProgrammes': 'لا توجد برامج منشورة حتى الآن.',
  'coach.about': 'نبذة',
  'coach.reviews': 'تقييم',
  'coach.noRating': 'لا توجد تقييمات بعد',
  'coach.followers': 'متابع',
  'coach.accepting': 'يستقبل متدربين جدد',
  'coach.notAccepting': 'لا يستقبل متدربين جدد حاليًا',
  'coach.days': 'يوم',
  'coach.ctaTitle': 'تدرب مع هذا المدرب',
  'coach.ctaBody': 'التدريب يتم داخل تطبيق Unlimited — خطتك، متابعتك، وتواصل مباشر مع مدربك.',
  'coach.ctaButton': 'تواصل معنا',

  // ─── Footer ───────────────────────────────────────────────────────────────
  'footer.rights': 'جميع الحقوق محفوظة.',
  'footer.terms': 'الشروط والأحكام',
  'footer.policy': 'سياسة الخصوصية',
  'footer.refund': 'سياسة الاسترجاع',
  'footer.madeIn': 'تصميم وتصنيع في مصر.',

  // ─── Misc ─────────────────────────────────────────────────────────────────
  'common.whatsapp': 'تواصل عبر واتساب',
  'common.loading': 'جارٍ التحميل…',
  'common.error': 'حدث خطأ ما. برجاء المحاولة مرة أخرى.',
};
