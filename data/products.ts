/**
 * STATIC PRODUCTS FALLBACK
 * ─────────────────────────────────────────────────────────────
 * HOW TO ADD YOUR IMAGES:
 *
 * 1. Put your image files in:   /public/images/
 *    (Next.js serves this folder automatically — no import needed)
 *
 * 2. Reference them as:   '/images/your-filename.jpg'
 *    (drop the "public" part — Next.js handles it)
 *
 * 3. Each image line below is clearly labeled.
 *    Replace the placeholder string with your real path.
 *
 * EXAMPLE:
 *   Was:  '/images/product1_gray_1.jpg',
 *   Now:  '/images/p1-gray-front.png',
 * ─────────────────────────────────────────────────────────────
 */

import { Product } from '../models/product';

/**
 * ═══════════════════════════════════════════════════════
 * STOCK MANAGEMENT — CHANGE THESE NUMBERS TO CONTROL STOCK
 * ═══════════════════════════════════════════════════════
 *
 * 0   = OUT OF STOCK (shows "Out of Stock" badge, disables Add to Cart)
 * 99  = IN STOCK     (shows normally)
 *
 * After changing, save the file and deploy.
 * ═══════════════════════════════════════════════════════
 */
const STOCK = {
  P1_GRAY: 0,    // Wall-mounted pull-up bar + Wall-parallel bar — Gray variant (OUT OF STOCK)
  P1_BLACK: 0,    // Wall-mounted pull-up bar + Wall-parallel bar — Black variant (OUT OF STOCK)
  P2_BLACK: 0,    // Wall-mounted pull-up bar — Black variant (OUT OF STOCK)
  P2_GRAY: 0,    // Wall-mounted pull-up bar — Gray variant (OUT OF STOCK)
  P3_BLACK: 99,   // Wall-parallel bar — Black variant
  P4_WOOD: 99,   // Floor parallettes — Wood variant
} as const;

// ─────────────────────────────────────────────────────────────
// PRODUCT 1 — Wall-mounted pull-up bar + Wall-parallel bar
// Gray: 14 images | Black: 17 images
// ─────────────────────────────────────────────────────────────

const P1_GRAY_MAIN = '/images/all-grayy/1763900966157-avnq5qjndt.png';

const P1_GRAY_IMAGES: string[] = [
  '/images/all-grayy/1763900966157-avnq5qjndt.png',
  '/images/all-grayy/1763901202402-bdlfhcw2tbu.png',
  '/images/all-grayy/1763901239148-v5inyhv6wxm.png',
  '/images/all-grayy/1763901262575-mjdv25lt679.png',
  '/images/all-grayy/1763901284509-ppbf4cx8nlm.png',
  '/images/all-grayy/1763901306131-sl9g9x66gsn.png',
  '/images/all-grayy/1763901359848-4ylo53jspev.png',
  '/images/all-grayy/1763901389052-wkydcq727n.png',
  '/images/all-grayy/1763901415394-t4qq6ove8go.png',
  '/images/all-grayy/1763901436181-bvcf5rbsuw8.png',
  '/images/all-grayy/1763901455647-hnumf5z07ga.png',
  '/images/all-grayy/1763901598294-p203ekdupv.png',
  '/images/ToAllOne.jpeg',
  '/images/ToAllTwo.jpeg'
];

const P1_BLACK_IMAGES: string[] = [
  '/images/all-blackk/1763899916757-8gww1b5h22g.png',
  '/images/all-blackk/1763899931578-ip5qhl6oeo.png',
  '/images/all-blackk/1763899945655-uuub86ejym.png',
  '/images/all-blackk/1763899972795-pozlv4zixp.png',
  '/images/all-blackk/1763899984157-ppv54ucv008.png',
  '/images/all-blackk/1763899996610-7xga0vi5mg2.png',
  '/images/all-blackk/1763900009070-v6b3oe2jvd.png',
  '/images/all-blackk/1763900025366-xzhktndau6d.png',
  '/images/all-blackk/1763900038451-3ztg26l2qv.png',
  '/images/all-blackk/1763900057468-qpqs9rjjhp9.png',
  '/images/all-blackk/1763900091793-p2iouq0mf5.png',
  '/images/all-blackk/1763900128187-5l7ojtjnss4.png',
  '/images/all-blackk/1763900149553-14yosu47f7s.png',
  '/images/all-blackk/1763900169848-k065tk67wv.png',
  '/images/all-blackk/1763900192028-p0lgo517u0p.png',
  '/images/ToAllOne.jpeg',
  '/images/ToAllTwo.jpeg'
];

// ─────────────────────────────────────────────────────────────
// PRODUCT 2 — Wall-mounted pull-up bar (standalone)
// Black: 12 images | Gray: 11 images
// ─────────────────────────────────────────────────────────────

const P2_BLACK_MAIN = '/images/pullUp-black/1763899041127-4vuzsmxhscg.png';
const P2_GRAY_MAIN = '/images/pullUp-gray/1763552820811-jr6hsv9iw8q.png';

const P2_BLACK_IMAGES: string[] = [
  '/images/pullUp-black/1763899041127-4vuzsmxhscg.png',
  '/images/pullUp-black/1763899054112-09gv54x3e6m.png',
  '/images/pullUp-black/1763899073808-b15fgxn2hmv.png',
  '/images/pullUp-black/1763899086869-d4yi45luxs.png',
  '/images/pullUp-black/1763899104487-3qg95079wss.png',
  '/images/pullUp-black/1763899119852-ehhrph60obv.png',
  '/images/pullUp-black/1763899130512-bvbggewxxon.png',
  '/images/pullUp-black/1763899141715-kill5q6q9y.png',
  '/images/pullUp-black/1763899174389-bqhzp4f4bd.png',
  '/images/pullUp-black/1763899206385-0rkjuv24ebm.png',
  '/images/pullUp-black/1763899226196-jy4sor15fy.png',
  '/images/ToAllOne.jpeg',
  '/images/ToAllTwo.jpeg'
];

const P2_GRAY_IMAGES: string[] = [
  '/images/pullUp-gray/1763552820811-jr6hsv9iw8q.png',
  '/images/pullUp-gray/1763552835304-7il4oqnp5ye.png',
  '/images/pullUp-gray/1763552863226-j5bsg4kgejr.png',
  '/images/pullUp-gray/1763552882007-6fgl8uwqcx8.png',
  '/images/pullUp-gray/1763552902348-3ik95b556k6.png',
  '/images/pullUp-gray/1763552918886-868ux3eq7cq.png',
  '/images/pullUp-gray/1763552929207-1dzf3gqd7pd.png',
  '/images/pullUp-gray/1763552939702-ierlitd4rcj.png',
  '/images/pullUp-gray/1763552950956-dm9tnsscq.png',
  '/images/pullUp-gray/1763552972158-tbu8shagjx.png',
  '/images/pullUp-gray/1763553001648-u4owh6ytnd.png',
  '/images/pullUp-gray/1763553021231-2uwr0rpyz77.png',
  '/images/ToAllOne.jpeg',
  '/images/ToAllTwo.jpeg'
];

// ─────────────────────────────────────────────────────────────
// PRODUCT 3 — Wall-parallel bar (standalone)
// Black: 11 images
// ─────────────────────────────────────────────────────────────
const P3_BLACK_MAIN = '/images/parallel-black/one-image.png';

const P3_BLACK_IMAGES: string[] = [
  '/images/parallel-black/one-image.png',
  '/images/parallel-black/two-image.png',
  '/images/parallel-black/three-image.png',
  '/images/parallel-black/four-image.png',
  '/images/parallel-black/five-image.png',
  '/images/parallel-black/six-image.png',
  '/images/parallel-black/seven-image.png',
  '/images/parallel-black/eight-image.png',
  '/images/ToAllOne.jpeg',
  '/images/ToAllTwo.jpeg'
];

// ─────────────────────────────────────────────────────────────
// PRODUCT 4 — Floor parallettes
// Wood: 11 images
// ─────────────────────────────────────────────────────────────

const P4_WOOD_MAIN = '/images/floor/1763591072902-pe88lp3te7.png';

const P4_WOOD_IMAGES: string[] = [
  '/images/floor/1763591072902-pe88lp3te7.png',
  '/images/floor/1763591122271-672hui8h1vs.png',
  '/images/floor/1763591161011-epo4mdn31x.png',
  '/images/floor/1763591200925-dptbngrum5k.png',
  '/images/floor/1763591213264-vbmcn6g9f4.png',
  '/images/floor/1763591234785-aa9706liyip.png',
  '/images/floor/1763591248852-lwfz3lqcmor.png',
  '/images/floor/1763591272311-30gowf76gy5.png',
  '/images/ToAllOne.jpeg',
  '/images/ToAllTwo.jpeg'
];

// ─────────────────────────────────────────────────────────────
// PRODUCTS ARRAY
// ─────────────────────────────────────────────────────────────

export const STATIC_PRODUCTS: Product[] = [
  {
    _id: 'static-product-1',
    name: 'Wall-mounted pull-up bar + Wall-parallel bar',
    price: 4999,
    mainImage: P1_GRAY_MAIN,
    description:
      'Wall-parallel bar support made of strong 3 mm heavy-duty steel with high-quality paint finish. Comes with special fixing screws and installation instructions.\n\n' +
      'Bar length: 60 cm\n' +
      'Bar diameter: 4.1 cm (1.6 inch)\n' +
      'Mounting base length: 20 cm\n' +
      'Steel thickness: 3 mm\n' +
      'Recommended distance between the two bars: 45–55 cm\n\n' +
      'Wall-mounted pull-up bar made of strong, high-quality 3 mm steel. Comes with special fixing screws and installation instructions.\n\n' +
      'Bar length: 110 cm\n' +
      'Distance from wall to bar: 85 cm\n' +
      'Bar diameter: 1.2 inches (3.1 cm)\n\n' +
      'حامل المتوازي الجداري مصنوع من الفولاذ القوي عالي التحمل بسمك 3 مم مع طلاء عالي الجودة. يأتي مع مسامير تثبيت خاصة.\n' +
      'طول البار: 60 سم | القطر: 4.1 سم | المسافة الموصى بها بين البارين: 45–55 سم\n\n' +
      'عقلة جدارية مصنوعة من الفولاذ القوي بسمك 3 مم. تأتي مع مسامير تثبيت خاصة.\n' +
      'طول البار: 110 سم | المسافة من الجدار إلى البار: 85 سم | القطر: 3.1 سم\n\n' +
      'وزن الطرد ٢٣ كيلو',
    detailedDescription:
      'Wall-parallel bar support made of strong 3 mm heavy-duty steel with high-quality paint finish. Comes with special fixing screws and installation instructions.\n\n' +
      'Bar length: 60 cm\n' +
      'Bar diameter: 4.1 cm (1.6 inch)\n' +
      'Mounting base length: 20 cm\n' +
      'Steel thickness: 3 mm\n' +
      'Recommended distance between the two bars: 45–55 cm\n\n' +
      'Wall-mounted pull-up bar made of strong, high-quality 3 mm steel. Comes with special fixing screws and installation instructions.\n\n' +
      'Bar length: 110 cm\n' +
      'Distance from wall to bar: 85 cm\n' +
      'Bar diameter: 1.2 inches (3.1 cm)\n\n' +
      'حامل المتوازي الجداري مصنوع من الفولاذ القوي عالي التحمل بسمك 3 مم مع طلاء عالي الجودة. يأتي مع مسامير تثبيت خاصة.\n' +
      'طول البار: 60 سم | القطر: 4.1 سم | المسافة الموصى بها بين البارين: 45–55 سم\n\n' +
      'عقلة جدارية مصنوعة من الفولاذ القوي بسمك 3 مم. تأتي مع مسامير تثبيت خاصة.\n' +
      'طول البار: 110 سم | المسافة من الجدار إلى البار: 85 سم | القطر: 3.1 سم\n\n' +
      'وزن الطرد ٢٣ كيلو',
    specifications:
      'Pull-up Bar:\n' +
      '• Bar length: 110 cm\n' +
      '• Distance from wall to bar: 85 cm\n' +
      '• Bar diameter: 1.2 inches (3.1 cm)\n\n' +
      'Parallel Bar:\n' +
      '• Bar length: 60 cm\n' +
      '• Bar diameter: 4.1 cm (1.6 inch)\n' +
      '• Mounting base length: 20 cm\n' +
      '• Steel thickness: 3 mm\n' +
      '• Recommended distance between bars: 45–55 cm\n\n' +
      'العقلة:\n' +
      '• طول البار: ١١٠ سم\n' +
      '• المسافة من الجدار للبار: ٨٥ سم\n' +
      '• قطر البار: ١.٢ بوصة (٣.١ سم)\n\n' +
      'المتوازي:\n' +
      '• طول البار: ٦٠ سم\n' +
      '• قطر البار: ٤.١ سم (١.٦ بوصة)\n' +
      '• طول قاعدة التثبيت: ٢٠ سم\n' +
      '• سمك الحديد: ٣ مم\n' +
      '• المسافة الموصى بها بين البارين: ٤٥ - ٥٥ سم',
    shippingInfo: 'Shipping delivery takes from 24–48 hours.',
    faqs: [
      { question: 'Bar length?', answer: '110 cm' },
      { question: 'Bar length (wall parallel)?', answer: '60 cm' },
    ],
    images: P1_GRAY_IMAGES,
    variants: [
      { name: 'Gray', stock: STOCK.P1_GRAY, images: P1_GRAY_IMAGES },
      { name: 'Black', stock: STOCK.P1_BLACK, images: P1_BLACK_IMAGES },
    ],
    stock: Math.max(STOCK.P1_GRAY, STOCK.P1_BLACK),
    isActive: true,
    isFeatured: true,
    order: 1,
    promoCode: '',
  },

  {
    _id: 'static-product-2',
    name: 'Wall-mounted pull-up bar',
    price: 3550,
    mainImage: P2_GRAY_MAIN,
    description:
      'Wall-mounted pull-up bar made of heavy-duty steel, with a net weight of 17 kg, a bar length of 110 cm, and a wall distance (depth) of 85 cm.\n\n' +
      'The pull-up bar is constructed from strong 3 mm and 6 mm steel plates, with a bar diameter of 41 mm.\n' +
      'It comes with 8 mounting bolts (size 17) along with their matching wall plugs.\n' +
      'Includes an external support brace for maximum stability during hanging.\n\n' +
      'عقلة جدارية من الحديد القوي بوزن صافي ١٧ كيلو وطول البار ١١٠ سم وبعده عند الجدار (عمق) ٨٥ سم\n' +
      'العقلة من الحديد القوي ٣ مليمتر و٦ مليمتر وسمك البار ٤١ مليمتر\n' +
      'يأتي معها ٨ مسامير تثبيت بمقاس ١٧ وفيشر الخاص بها\n' +
      'دعامة بار خارجية لضمان الثبات أثناء التعلق',
    detailedDescription:
      'Wall-mounted pull-up bar made of heavy-duty steel, with a net weight of 17 kg, a bar length of 110 cm, and a wall distance (depth) of 85 cm.\n\n' +
      'The pull-up bar is constructed from strong 3 mm and 6 mm steel plates, with a bar diameter of 41 mm.\n' +
      'It comes with 8 mounting bolts (size 17) along with their matching wall plugs.\n' +
      'Includes an external support brace for maximum stability during hanging.\n\n' +
      'عقلة جدارية من الحديد القوي بوزن صافي ١٧ كيلو وطول البار ١١٠ سم وبعده عند الجدار (عمق) ٨٥ سم\n' +
      'العقلة من الحديد القوي ٣ مليمتر و٦ مليمتر وسمك البار ٤١ مليمتر\n' +
      'يأتي معها ٨ مسامير تثبيت بمقاس ١٧ وفيشر الخاص بها\n' +
      'دعامة بار خارجية لضمان الثبات أثناء التعلق',
    specifications:
      '• Bar length: 110 cm\n' +
      '• Distance from wall to bar: 85 cm\n' +
      '• Bar diameter: 1.2 inches (3.1 cm)\n' +
      '• Steel thickness: 3 mm & 6 mm plates\n' +
      '• Net weight: 17 kg\n' +
      '• Comes with 8 mounting bolts (size 17) + wall plugs\n' +
      '• External support brace included\n\n' +
      '• طول البار: ١١٠ سم\n' +
      '• المسافة من الجدار للبار: ٨٥ سم\n' +
      '• قطر البار: ١.٢ بوصة (٣.١ سم)\n' +
      '• سمك الحديد: ألواح ٣ مم و ٦ مم\n' +
      '• الوزن الصافي: ١٧ كيلو\n' +
      '• يأتي مع ٨ مسامير تثبيت (مقاس ١٧) + فيشر\n' +
      '• دعامة بار خارجية متضمنة للثبات',
    shippingInfo:
      'Shipping delivery takes from 24–48 hours.\n\n' +
      'قبل الشراء ولجدية الشراء لو اخترت الدفع عند الاستلام بتدفع ديبوزت لضمان جدية الشراء والاستلام ولو فيه أي عيب صناعة طبعاً بتسترد فلوسك وبنرجعها.',
    faqs: [
      { question: 'Bar length?', answer: '110 cm' },
      { question: 'Distance from wall to bar?', answer: '85 cm' },
      { question: 'Bar diameter?', answer: '1.2 inches (3.1 cm)' },
    ],
    images: P2_GRAY_IMAGES,
    variants: [
      { name: 'Gray', stock: STOCK.P2_GRAY, images: P2_GRAY_IMAGES },
      { name: 'Black', stock: STOCK.P2_BLACK, images: P2_BLACK_IMAGES },
    ],
    stock: Math.max(STOCK.P2_BLACK, STOCK.P2_GRAY),
    isActive: true,
    isFeatured: false,
    order: 2,
    promoCode: '',
  },

  {
    _id: 'static-product-3',
    name: 'Wall-parallel bar',
    price: 1580,
    mainImage: P3_BLACK_MAIN,
    description:
      'Wall-parallel bar support made of strong 3 mm heavy-duty steel with high-quality paint finish. Comes with special fixing screws and installation instructions.\n\n' +
      'Bar length: 60 cm\n' +
      'Bar diameter: 4.1 cm (1.6 inch)\n' +
      'Mounting base length: 20 cm\n' +
      'Steel thickness: 3 mm\n' +
      'Recommended distance between the two bars: 45–55 cm\n\n' +
      'حامل المتوازي الجداري مصنوع من الفولاذ القوي عالي التحمل بسمك 3 مم مع طلاء عالي الجودة. يأتي مع مسامير تثبيت خاصة وتعليمات التركيب.\n' +
      'طول البار: 60 سم | القطر: 4.1 سم | المسافة الموصى بها بين البارين: 45–55 سم\n\n' +
      'وزن الطرد ٦ كيلو',
    detailedDescription:
      'Wall-parallel bar support made of strong 3 mm heavy-duty steel with high-quality paint finish. Comes with special fixing screws and installation instructions.\n\n' +
      'Bar length: 60 cm\n' +
      'Bar diameter: 4.1 cm (1.6 inch)\n' +
      'Mounting base length: 20 cm\n' +
      'Steel thickness: 3 mm\n' +
      'Recommended distance between the two bars: 45–55 cm\n\n' +
      'حامل المتوازي الجداري مصنوع من الفولاذ القوي عالي التحمل بسمك 3 مم مع طلاء عالي الجودة. يأتي مع مسامير تثبيت خاصة وتعليمات التركيب.\n' +
      'طول البار: 60 سم | القطر: 4.1 سم | المسافة الموصى بها بين البارين: 45–55 سم\n\n' +
      'وزن الطرد ٦ كيلو',
    specifications:
      '• Bar length: 60 cm\n' +
      '• Bar diameter: 4.1 cm (1.6 inch)\n' +
      '• Mounting base length: 20 cm\n' +
      '• Steel thickness: 3 mm\n' +
      '• Recommended distance between bars: 45–55 cm\n\n' +
      '• طول البار: ٦٠ سم\n' +
      '• قطر البار: ٤.١ سم (١.٦ بوصة)\n' +
      '• طول قاعدة التثبيت: ٢٠ سم\n' +
      '• سمك الحديد: ٣ مم\n' +
      '• المسافة الموصى بها بين البارين: ٤٥ - ٥٥ سم',
    shippingInfo: 'Shipping delivery takes from 24–48 hours.',
    faqs: [
      { question: 'Recommended distance between the two bars?', answer: '45–55 cm' },
      { question: 'Steel thickness?', answer: '3 mm' },
      { question: 'Mounting base length?', answer: '20 cm' },
      { question: 'Bar diameter?', answer: '4.1 cm (1.6 inch)' },
      { question: 'Bar length?', answer: '60 cm' },
    ],
    images: P3_BLACK_IMAGES,
    variants: [
      { name: 'Black', stock: STOCK.P3_BLACK, images: P3_BLACK_IMAGES },
    ],
    stock: STOCK.P3_BLACK,
    isActive: true,
    isFeatured: false,
    order: 3,
    promoCode: '',
  },

  {
    _id: 'static-product-4',
    name: 'Floor parallettes',
    price: 1599,
    mainImage: P4_WOOD_MAIN,
    description:
      'متوازي خشب أرضي للكاليسثينكس مصنوع من الخشب الزان القوي بطول 50 سم وسمك ٤١ مم وارتفاع ١٢ سم\n\n' +
      'Wooden floor parallettes for calisthenics, made of strong beech wood, 50 cm long, 41 mm thick, and 12 cm high.\n\nوزن الطرد ٦ كيلو',
    detailedDescription:
      ' متوازي خشب أرضي للكاليسثينكس مصنوع من الخشب الزان القوي بطول 50 سم وسمك ٤١ مم وارتفاع ١٢ سم\n\n' +
      'Wooden floor parallettes for calisthenics, made of strong beech wood, 50 cm long, 41 mm thick, and 12 cm high.\n\nوزن الطرد ٦ كيلو',

    specifications:
      '• Material: Beech wood\n' +
      '• Length: 50 cm\n' +
      '• Thickness: 41 mm\n' +
      '• Height: 12 cm\n\n' +
      '• المادة: خشب زان\n' +
      '• الطول: ٥٠ سم\n' +
      '• السمك: ٤١ مم\n' +
      '• الارتفاع: ١٢ سم',
    shippingInfo:
      'الشحن من ٢٤ : ٤٨ ساعة\n' +
      'وزن الطرد ٦ كيلو',
    faqs: [],
    images: P4_WOOD_IMAGES,
    variants: [
      { name: 'Wood', stock: STOCK.P4_WOOD, images: P4_WOOD_IMAGES },
    ],
    stock: STOCK.P4_WOOD,
    isActive: true,
    isFeatured: false,
    order: 4,
    promoCode: '',
  },
];

// ─── Quick lookup by ID ───────────────────────────────────────
// ─── Helpers ────────────────────────────────────────────────────────
export function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Quick lookup by ID or slug ───────────────────────────────────────
export function getStaticProductById(idOrSlug: string): Product | undefined {
  return STATIC_PRODUCTS.find(p => {
    if (p._id === idOrSlug) return true;
    return nameToSlug(p.name) === idOrSlug;
  });
}

// ─── Only active products (mirrors getActiveProducts) ─────────
export function getStaticActiveProducts(featuredOnly = false): Product[] {
  return STATIC_PRODUCTS.filter(p =>
    p.isActive && (!featuredOnly || p.isFeatured)
  ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
