/**
 * Every word of the home page's feedback section, in both languages
 * (3 Nov 2026). Arabic is Modern Standard. The star words speak the
 * gym's language and end on the brand's own: Unlimited / بلا حدود.
 */

export type FeedbackLocale = 'en' | 'ar';

export const FEEDBACK_WORDS = {
  en: {
    title: 'Share your feedback',
    lead: 'Reviews appear once approved.',
    q1: 'How was your equipment?',
    q2: 'Tell us more',
    q3: 'Who is writing?',
    q4: 'A phone number?',
    q4hint: 'Only if you want us to call you back.',
    message: 'Your feedback',
    messageHint: 'What did you buy, and how is it going?',
    name: 'Name',
    namePlaceholder: 'Your name',
    email: 'Email',
    phone: 'Phone',
    optional: '(optional)',
    next: 'Next',
    back: 'Back',
    send: 'Send feedback',
    sending: 'Sending…',
    step: 'Step {n} of 4',
    stars: ['', 'Needs work', 'Getting there', 'Solid', 'Strong', 'Unlimited'],
    needMessage: 'Write a few words about your equipment.',
    needName: 'Please write your name.',
    badEmail: 'That email address does not look right.',
    tooMany: 'Too many tries. Please wait a few minutes and send again.',
    failed: 'Your feedback was not sent. Check your connection and send again.',
    thanks: 'Thank you',
    thanksBody: 'Your review appears on the site once approved.',
    again: 'Write another',
    reviews: 'What athletes say',
  },
  ar: {
    title: 'شاركنا رأيك',
    lead: 'تظهر الآراء بعد مراجعتها.',
    q1: 'كيف وجدت معداتك؟',
    q2: 'أخبرنا أكثر',
    q3: 'من يكتب؟',
    q4: 'رقم هاتف؟',
    q4hint: 'فقط إن أردت أن نتصل بك.',
    message: 'رأيك',
    messageHint: 'ماذا اشتريت، وكيف تجده؟',
    name: 'الاسم',
    namePlaceholder: 'اسمك',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    optional: '(اختياري)',
    next: 'التالي',
    back: 'رجوع',
    send: 'أرسل رأيك',
    sending: 'جارٍ الإرسال…',
    step: 'الخطوة {n} من 4',
    stars: ['', 'يحتاج تحسين', 'في الطريق', 'جيد', 'قوي', 'بلا حدود'],
    needMessage: 'اكتب كلمات قليلة عن معداتك.',
    needName: 'اكتب اسمك.',
    badEmail: 'البريد الإلكتروني غير صحيح.',
    tooMany: 'محاولات كثيرة. انتظر بضع دقائق ثم أرسل مرة أخرى.',
    failed: 'لم يُرسل رأيك. تحقق من اتصالك وأرسل مرة أخرى.',
    thanks: 'شكرًا لك',
    thanksBody: 'يظهر رأيك في الموقع بعد مراجعته.',
    again: 'اكتب رأيًا آخر',
    reviews: 'ماذا يقول الرياضيون',
  },
} as const;

/** The server refuses longer messages (app/api/feedback). */
export const MAX_MESSAGE = 500;

/** The checks the server makes, said first in the reader's language. Pure. */
export function checkStep(
  step: 2 | 3,
  values: { message: string; name: string; email: string },
  locale: FeedbackLocale
): string | null {
  const w = FEEDBACK_WORDS[locale];
  if (step === 2) return values.message.trim() ? null : w.needMessage;
  if (!values.name.trim()) return w.needName;
  const email = values.email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return w.badEmail;
  return null;
}
