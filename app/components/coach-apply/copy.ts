/**
 * ============================================================
 * unlimited-sw · coach apply · copy.ts
 * JOB: every word on the application page, in both languages.
 * USED BY: CoachApplyPage.tsx, ApplyForm.tsx, and the two welcome pages.
 * RULES: · it lives here rather than in i18n/en.ts because this is a whole
 *          page of prose, not UI labels — thirty marketing sentences in
 *          the shop's string table would bury the strings that belong there
 *        · the Arabic is Modern Standard, never dialect, and it is a
 *          translation of the ARGUMENT rather than of the words
 * ============================================================
 *
 * THE ARABIC IS A DRAFT UNTIL HATEM READS IT ALOUD.
 * It is correct MSA and it is written to be persuasive, but the sentence
 * that lands in Cairo is a judgement only he can make. The line most
 * worth a second look is `under`.
 */

export type Locale = 'en' | 'ar';

export const APPLY_COPY = {
  en: {
    metaTitle: 'Coach at Unlimited',
    metaDescription:
      'Apply to coach at Unlimited. Pick an interview time with the head ' +
      'coach and we email you the details.',

    eyebrow: 'Coaching applications — open',
    headline: ['One place. ', 'Coach inside the calisthenics community.'] as const,
    under: 'Two minutes. Pick an interview time and we email you the details.',

    applyTitle: 'Apply',
    // Applications closed by the team (10 Nov 2026): coaches join by invitation.
    eyebrowClosed: 'Coaching applications — closed for now',
    underClosed:
      'For now we choose Unlimited’s coaches ourselves and are not taking new ' +
      'applications. Follow us — we will say when they open again.',
    fields: {
      name: 'Full name',
      email: 'Email',
      phone: 'Phone',
      city: 'City',
      years: 'Years coaching',
      birthday: 'Date of birth',
      specialities: 'Specialities',
      portfolio: 'Instagram or portfolio',
      why: 'Why here',
    },
    placeholders: {
      name: 'Omar Said',
      email: 'you@example.com',
      phone: '+20 100 000 0000',
      city: 'Cairo',
      years: '6',
      birthday: '',
      specialities: 'Strength, mobility',
      portfolio: 'instagram.com/yourname',
      why: 'Tell us what you coach and who you coach it for.',
    },
    hints: {
      email: 'Use the address you will sign in with.',
      portfolio: 'Required — it is the first thing we look at.',
    },

    slotsLabel: 'Pick your interview',
    slotsNone: 'No times open yet. Send the form and we will email you one.',
    slotsNoneLater: 'No times open right now. We will email you as soon as one opens.',
    slotsLoading: 'Loading the times…',
    slotsUnavailable: 'We could not load the interview times just now.',
    slotsRetry: 'Try again',
    slotFilled: 'Filled',
    timezone: 'Shown in your timezone.',

    send: 'Send application',
    sending: 'Sending…',
    sendNoteBooked: 'Your time is booked the moment you send. We email you the Google Meet link and a calendar invite.',
    sendNoteWaiting: 'No time chosen: you join the waiting list, and we email you a link to pick one.',

    doneTitle: 'Application received. You are on the waiting list.',
    doneBody: 'We emailed you a link to pick your interview time. Not in your inbox? Check spam.',

    confirmedTitle: 'Your interview is booked.',
    confirmedBody: 'The Google Meet link and a calendar invite are on their way to your email. Not in your inbox? Check spam.',
    confirming: 'One moment…',

    welcomeEyebrow: 'Approved',
    welcomeHeadline: ["You're in. ", 'Now set up your side.'] as const,
    welcomeUnder:
      'Sign in with the same email address you applied with — email and ' +
      'password, or Google. An Apple relay address will not match your ' +
      'application.',
    welcomeAppTitle: 'The app',
    welcomeAppBody:
      'Where you live day to day: your athletes, their check-ins, and your ' +
      'messages. Download it and sign in.',
    welcomeDashTitle: 'The dashboard',
    welcomeDashBody:
      'Where you build programmes and plans, and edit the public profile ' +
      'people will find.',
    welcomeDashLink: 'Open the dashboard',
    welcomeTroubleTitle: 'If sign-in does not recognise you',
    welcomeTroubleBody:
      'That almost always means a different email address. Write to us and ' +
      'we will link your account by hand.',
  },

  ar: {
    metaTitle: 'كن مدربًا في Unlimited',
    metaDescription:
      'قدّم للتدريب في Unlimited. اختر موعد مقابلة مع المدرب الأول ' +
      'وسنرسل لك التفاصيل بالبريد.',

    eyebrow: 'التقديم للتدريب — مفتوح',
    headline: ['مكان واحد. ', 'درّب داخل مجتمع الكاليسثنكس.'] as const,
    under: 'دقيقتان فقط. اختر موعد المقابلة وسنرسل لك التفاصيل بالبريد.',

    applyTitle: 'التقديم',
    // Applications closed by the team (10 Nov 2026): coaches join by invitation.
    eyebrowClosed: 'التقديم للتدريب — مغلق حاليًا',
    underClosed:
      'نختار مدربي Unlimited بأنفسنا في الوقت الحالي، ولا نستقبل طلبات جديدة. ' +
      'تابعنا وسنعلن عند فتح التقديم من جديد.',
    fields: {
      name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      city: 'المدينة',
      years: 'سنوات الخبرة',
      birthday: 'تاريخ الميلاد',
      specialities: 'التخصصات',
      portfolio: 'إنستغرام أو معرض أعمال',
      why: 'لماذا هنا',
    },
    placeholders: {
      name: 'عمر سعيد',
      email: 'you@example.com',
      phone: '+20 100 000 0000',
      city: 'القاهرة',
      years: '6',
      birthday: '',
      specialities: 'قوة، مرونة',
      portfolio: 'instagram.com/yourname',
      why: 'اكتب لنا ماذا تدرّب ولمن.',
    },
    hints: {
      email: 'استخدم البريد الذي ستسجّل الدخول به.',
      portfolio: 'مطلوب — هو أول ما ننظر إليه.',
    },

    slotsLabel: 'اختر موعد المقابلة',
    slotsNone: 'لا توجد مواعيد متاحة بعد. أرسل النموذج وسنراسلك بموعد.',
    slotsNoneLater: 'لا توجد مواعيد متاحة الآن. سنراسلك فور فتح موعد جديد.',
    slotsLoading: 'جارٍ تحميل المواعيد…',
    slotsUnavailable: 'تعذّر تحميل مواعيد المقابلات الآن.',
    slotsRetry: 'أعد المحاولة',
    slotFilled: 'ممتلئ',
    timezone: 'المواعيد بتوقيت جهازك.',

    send: 'أرسل الطلب',
    sending: 'جارٍ الإرسال…',
    sendNoteBooked: 'يُحجز موعدك فور الإرسال، ونرسل لك رابط Google Meet ودعوة التقويم بالبريد.',
    sendNoteWaiting: 'لم تختر موعدًا: ستنضم إلى قائمة الانتظار، ونرسل لك رابطًا لاختيار موعد.',

    doneTitle: 'استلمنا طلبك. أنت في قائمة الانتظار.',
    doneBody: 'أرسلنا لك رابطًا بالبريد لاختيار موعد المقابلة. لم تجده؟ راجع مجلد الرسائل غير المرغوب فيها.',

    confirmedTitle: 'تم حجز موعد مقابلتك.',
    confirmedBody: 'رابط Google Meet ودعوة التقويم في طريقهما إلى بريدك. لم تجدهما؟ راجع مجلد الرسائل غير المرغوب فيها.',
    confirming: 'لحظة…',

    welcomeEyebrow: 'تمت الموافقة',
    welcomeHeadline: ['أنت معنا. ', 'جهّز حسابك الآن.'] as const,
    welcomeUnder:
      'سجّل الدخول بنفس البريد الإلكتروني الذي قدمت به — بريد وكلمة مرور، ' +
      'أو Google. بريد Apple المخفي لن يطابق طلبك.',
    welcomeAppTitle: 'التطبيق',
    welcomeAppBody:
      'مكان عملك اليومي: متدربوك ومتابعاتهم ورسائلك. حمّله وسجّل الدخول.',
    welcomeDashTitle: 'لوحة التحكم',
    welcomeDashBody:
      'مكان بناء البرامج والخطط، وتعديل صفحتك العامة التي يجدها الناس.',
    welcomeDashLink: 'افتح لوحة التحكم',
    welcomeTroubleTitle: 'إذا لم يتعرف عليك تسجيل الدخول',
    welcomeTroubleBody:
      'غالبًا يكون السبب بريدًا مختلفًا. راسلنا وسنربط حسابك يدويًا.',
  },
} as const;

export type ApplyCopy = (typeof APPLY_COPY)['en'];
