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
 * that lands in Cairo is a judgement only he can make. The line most worth
 * arguing about is `expect.title` — «ما نتوقعه منك» is direct, and a page
 * courting people may want softer.
 */

export type Locale = 'en' | 'ar';

export const APPLY_COPY = {
  en: {
    metaTitle: 'Coach at Unlimited',
    metaDescription:
      'Apply to coach at Unlimited. A small number of coaches, each ' +
      'interviewed in person by the head coach.',

    eyebrow: 'Coaching applications — open',
    headline: ['One place. ', 'Coach inside the calisthenics community.'] as const,
    under:
      'Your athletes, your plans and your income — in one place, ' +
      'where people already train.',

    getTitle: 'What you get',
    get1a:
      'Athletes ready to train. A plan builder with a full video library. ' +
      'A public profile people can find. ',
    get1b: 'You keep most of what they pay.',
    get2:
      'Check-ins, messages and progress live in the app. ' +
      'Programmes are built on the dashboard.',

    expectTitle: 'What we expect',
    terms: [
      {
        title: 'Answer your athletes',
        body: 'They paid for a coach. Be there.',
      },
      {
        title: 'Coach under your name',
        body: 'Your profile is public. Your rating is earned.',
      },
      {
        title: 'Meet us first',
        body: 'One real interview with the head coach. That is the filter.',
      },
    ],

    applyTitle: 'Apply',
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
    slotsLoading: 'Loading the times…',
    slotsUnavailable: 'We could not load the interview times just now.',
    slotsRetry: 'Try again',
    timezone: 'Shown in your timezone. The time is held once you confirm your email.',

    send: 'Send application',
    sending: 'Sending…',
    sendNote: 'We will email you a link. Your interview is held once you click it.',

    doneTitle: 'Check your inbox.',
    doneBody: 'Click the link we sent. Your time is held after that.',

    confirmedTitle: 'Your interview is booked.',
    confirmedBody: 'We have sent it to your calendar. See you then.',
    confirming: 'One moment…',

    stripLeft: 'Applications are read by the head coach.',
    stripMiddle: 'Interviews in person · Cairo',

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
      'قدّم للتدريب في Unlimited. عدد محدود من المدربين، ويقابل المدرب ' +
      'الأول كل واحد منهم شخصيًا.',

    eyebrow: 'التقديم للتدريب — مفتوح',
    headline: ['مكان واحد. ', 'درّب داخل مجتمع الكاليسثنكس.'] as const,
    under: 'متدربوك وخططك ودخلك في مكان واحد، حيث يتدرّب الناس بالفعل.',

    getTitle: 'ما تحصل عليه',
    get1a:
      'متدربون جاهزون للتدريب. منشئ خطط بمكتبة فيديو كاملة. ' +
      'صفحة عامة يجدك الناس من خلالها. ',
    get1b: 'تحتفظ بالنسبة الأكبر مما يدفعونه.',
    get2: 'المتابعات والرسائل والتقدّم في التطبيق، والبرامج تُبنى من لوحة التحكم.',

    expectTitle: 'ما نتوقعه منك',
    terms: [
      {
        title: 'ترد على متدربيك',
        body: 'دفعوا مقابل مدرب. كن حاضرًا.',
      },
      {
        title: 'تدرّب باسمك',
        body: 'صفحتك عامة، وتقييمك تكسبه بعملك.',
      },
      {
        title: 'تقابلنا أولًا',
        body: 'مقابلة حقيقية واحدة مع المدرب الأول. هذا هو الفلتر.',
      },
    ],

    applyTitle: 'التقديم',
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
    slotsLoading: 'جارٍ تحميل المواعيد…',
    slotsUnavailable: 'تعذّر تحميل مواعيد المقابلات الآن.',
    slotsRetry: 'أعد المحاولة',
    timezone: 'المواعيد بتوقيت جهازك. يُحجز الموعد بعد تأكيد بريدك.',

    send: 'أرسل الطلب',
    sending: 'جارٍ الإرسال…',
    sendNote: 'سنرسل لك رابطًا بالبريد. يُحجز موعدك بعد الضغط عليه.',

    doneTitle: 'تفقّد بريدك.',
    doneBody: 'اضغط الرابط الذي أرسلناه، وبعدها يُحجز موعدك.',

    confirmedTitle: 'تم حجز موعد مقابلتك.',
    confirmedBody: 'أرسلناه إلى تقويمك. في انتظارك.',
    confirming: 'لحظة…',

    stripLeft: 'يقرأ الطلبات المدرب الأول.',
    stripMiddle: 'المقابلات شخصية · القاهرة',

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
