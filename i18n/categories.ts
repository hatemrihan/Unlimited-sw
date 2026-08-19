import type { CategoryKey } from '@/product/categories';

/**
 * Category page copy — the 150–300 word intro and the FAQ block that make each
 * category page worth indexing rather than a bare product grid.
 *
 * DRAFT: written to unblock the routes. Dr. Alkady should correct the technical
 * claims in particular — wall fixings, load ratings and steel gauges are stated
 * here as fact and are the kind of detail a competitor or a customer will check.
 *
 * Keep each intro above ~150 words. A category page with a heading and six
 * product tiles is a thin page, and Google treats a set of them as a pattern.
 */
export interface CategoryCopy {
  intro: string;
  faqs: Array<{ question: string; answer: string }>;
}

export const CATEGORY_COPY_EN: Record<CategoryKey, CategoryCopy> = {
  'pull-up-bars': {
    intro:
      'A wall-mounted pull-up bar is the foundation of any home calisthenics setup. Ours are welded from heavy-gauge steel in our own workshop in Egypt, powder-coated against the humidity, and supplied with the fixings for solid brick or concrete. The bar sits far enough from the wall that your head and knees clear it on every rep, which is the single most common complaint about cheaper imported bars.\n\n' +
      'We build the bars in a few widths and depths so you can match the one you buy to the wall you actually have. If you are unsure which fits, send us a photo of the wall and the space around it and we will tell you — it costs us nothing and saves you a return.\n\n' +
      'Every bar ships anywhere in Egypt with cash on delivery, and every price on this page is in Egyptian pounds with nothing added at the door. If you are setting up from scratch, most people start with a pull-up bar and add parallel bars later.',
    faqs: [
      {
        question: 'What kind of wall do I need?',
        answer:
          'Solid brick or reinforced concrete. Hollow block, plasterboard and single-skin partition walls are not safe for a pull-up bar at any price — if that is what you have, a free-standing frame is the right answer instead. Send us a photo if you are not sure.',
      },
      {
        question: 'How much weight does it hold?',
        answer:
          'The bar and its welds are built well beyond bodyweight use, including dynamic movements like muscle-ups. In practice the limit is the wall and the fixings, not the bar — which is why we supply fixings rated for the job rather than leaving you to buy them.',
      },
      {
        question: 'Do you install it?',
        answer:
          'We supply the bar, the fixings and the drilling template. Installation is straightforward for anyone comfortable with a hammer drill; if you would rather not, any handyman can do it in under an hour with our instructions.',
      },
      {
        question: 'How far from the wall does it sit?',
        answer:
          'Far enough to clear your head on a strict pull-up and your knees on leg raises. The exact distance is on each product page, because it differs between models — check it against the space you have.',
      },
    ],
  },

  'dip-parallel-bars': {
    intro:
      'Dips build the pressing strength that pull-ups do not. Our dip and parallel bars are made in Egypt from the same heavy-gauge steel as our pull-up bars, in wall-mounted and free-standing versions, so you can put them where you have room rather than where a catalogue says.\n\n' +
      'Bar spacing matters more than people expect: too wide and the shoulder takes load it should not, too narrow and you cannot get depth. We build to a spacing that suits most adults and state the exact figure on every product page so you can check it against your own shoulders before you buy.\n\n' +
      'The grip diameter is chosen so that your hand closes properly around it. A bar that is too thick turns a set of dips into a grip exercise, which is not what you came for. Everything on this page ships across Egypt with cash on delivery, priced in Egyptian pounds.',
    faqs: [
      {
        question: 'Wall-mounted or free-standing?',
        answer:
          'Wall-mounted is more rigid and takes no floor space, but needs a solid wall. Free-standing works anywhere, moves when you need the room back, and is the right choice for rented flats where drilling is not an option.',
      },
      {
        question: 'What spacing should I look for?',
        answer:
          'Roughly shoulder width, a little wider. Too wide loads the shoulder joint in a position it is weak in. The exact spacing is listed on each product page — measure your own shoulders and compare.',
      },
      {
        question: 'Can I use them for other exercises?',
        answer:
          'Yes. Parallel bars take dips, L-sits, tucked front lever work, support holds and inverted rows if the height suits. They are one of the most useful pieces of equipment per square metre you can own.',
      },
    ],
  },

  'parallettes': {
    intro:
      'Parallettes are the smallest piece of equipment that genuinely changes what you can train. They lift your hands off the floor, which lets your wrists sit in a neutral position and gives you the clearance for L-sits, tucked planches, deep push-ups and handstand work that flat ground simply does not allow.\n\n' +
      'Ours are made in Egypt with a wooden grip and a steel base. The wood is there for a reason: it warms to the hand, does not get slippery with sweat the way bare steel does, and is kinder on the skin over a long session. The base is wide enough that they do not tip under a shifting load, which is what separates a usable pair from a nervous one.\n\n' +
      'They are the easiest thing here to store — under a bed, behind a door — and the easiest to travel with. Prices are in Egyptian pounds, delivered anywhere in Egypt, cash on delivery.',
    faqs: [
      {
        question: 'Low or high parallettes?',
        answer:
          'Low parallettes suit push-ups, L-sits and planche work, and are more stable. High ones give clearance for deeper skills and tuck work. Most people should start low — the extra height is only useful once the strength is there.',
      },
      {
        question: 'Do they work on any floor?',
        answer:
          'They are stable on tile, wood and concrete. On thick carpet or a soft mat they can sink unevenly, which is worth knowing before you train handstands on one.',
      },
      {
        question: 'Are they worth it if I already have parallel bars?',
        answer:
          'Yes, for different work. Parallel bars are for dips and support holds at height; parallettes are for floor skills — planche, L-sit, handstand push-ups. They are not substitutes for each other.',
      },
    ],
  },

  'accessories': {
    intro:
      'The pieces that finish a setup: gymnastic rings, grips, straps and the smaller items that make the rest of the equipment more useful.\n\n' +
      'Rings are the most demanding tool in calisthenics and the most rewarding. Because nothing about them is fixed, every rep recruits the stabilising muscles that a rigid bar lets you skip — which is exactly why ring dips and ring rows feel so much harder than the same movement on steel. Hang them from a bar, a beam or a frame, and adjust the height in seconds.\n\n' +
      'Everything on this page is chosen to work with the bars and parallettes we build, rather than picked from a catalogue. If you are unsure whether something fits what you already own, ask us before you order. Prices are in Egyptian pounds and everything ships across Egypt with cash on delivery.',
    faqs: [
      {
        question: 'What can I hang rings from?',
        answer:
          'Any of our pull-up bars, a solid beam, or a free-standing frame rated for dynamic load. Do not hang them from a doorway bar that only wedges into the frame — the load direction is different and it can come loose.',
      },
      {
        question: 'Wooden or plastic rings?',
        answer:
          'Wood gives a better grip as your hands get sweaty and is what most people prefer for training indoors. Plastic is cheaper and handles being left outside in the weather.',
      },
      {
        question: 'Do I need rings if I already have a bar?',
        answer:
          'Not to start. Rings are the next step once bar work has stopped being hard — they take the same movements and make them demanding again by removing the stability.',
      },
    ],
  },
};

export const CATEGORY_COPY_AR: Record<CategoryKey, CategoryCopy> = {
  'pull-up-bars': {
    intro:
      'عقلة الحائط هي أساس أي تجهيز منزلي للكاليسثينكس. عقلاتنا مصنوعة ومُلحَّمة في ورشتنا في مصر من صاج سميك، ومطلية بطلاء يقاوم الرطوبة، وتأتي معها مسامير التثبيت المناسبة للطوب المصمت أو الخرسانة. المسافة بين البار والحائط محسوبة بحيث لا يصطدم رأسك ولا ركبتاك بالحائط في أي تكرار — وهي أكثر شكوى نسمعها عن العقلات المستوردة الرخيصة.\n\n' +
      'ننتج العقلة بأكثر من عرض وعمق حتى تختار ما يناسب حائطك أنت، لا ما يناسب الكتالوج. لو لست متأكداً من المقاس، أرسل لنا صورة للحائط والمساحة حوله وسنقول لك أيهما يناسبك — لا يكلفنا شيئاً ويوفر عليك عناء الإرجاع.\n\n' +
      'الشحن متاح لكل محافظات مصر مع الدفع عند الاستلام، وكل الأسعار هنا بالجنيه المصري بدون أي إضافات عند الباب. لو كنت تبدأ من الصفر، الأغلب يبدأ بالعقلة ثم يضيف المتوازي لاحقاً.',
    faqs: [
      {
        question: 'ما نوع الحائط المناسب؟',
        answer:
          'طوب مصمت أو خرسانة مسلحة. الطوب المفرَّغ والجبس بورد والحوائط الفاصلة الرفيعة غير آمنة لتركيب عقلة مهما كان سعرها — لو هذا ما لديك فالحل الصحيح هو ستاند مستقل. أرسل لنا صورة لو لم تكن متأكداً.',
      },
      {
        question: 'كم وزناً تتحمل؟',
        answer:
          'البار واللحامات مصممة لتتحمل أكثر بكثير من وزن الجسم، بما في ذلك الحركات السريعة مثل المسل أب. عملياً الحد ليس البار بل الحائط والمسامير — ولهذا نورد معها مسامير مناسبة بدلاً من تركك تشتريها بنفسك.',
      },
      {
        question: 'هل تقومون بالتركيب؟',
        answer:
          'نورد البار والمسامير وورقة تحديد أماكن الثقوب. التركيب سهل لمن لديه شنيور دقاق؛ ولو فضّلت غير ذلك، أي فني يستطيع تركيبها في أقل من ساعة باتباع التعليمات.',
      },
      {
        question: 'كم تبعد عن الحائط؟',
        answer:
          'مسافة كافية لتفادي اصطدام الرأس في العقلة الكاملة والركبتين في رفع الأرجل. المسافة الدقيقة مذكورة في صفحة كل منتج لأنها تختلف بين الموديلات — قارنها بالمساحة المتاحة عندك.',
      },
    ],
  },

  'dip-parallel-bars': {
    intro:
      'تمرين المتوازي يبني قوة الدفع التي لا تبنيها العقلة. متوازياتنا مصنوعة في مصر من نفس الصاج السميك المستخدم في العقلات، بنسختين: مثبتة على الحائط أو مستقلة، حتى تضعها حيث تسمح مساحتك.\n\n' +
      'المسافة بين البارين أهم مما يتصور الكثيرون: لو كانت واسعة أكثر من اللازم يتحمل الكتف حِملاً في وضع ضعيف، ولو كانت ضيقة لن تصل إلى العمق المطلوب. نصنعها بمسافة تناسب أغلب البالغين، ونذكر الرقم الدقيق في صفحة كل منتج حتى تقارنه بعرض كتفيك قبل الشراء.\n\n' +
      'قُطر المقبض مختار بحيث تُطبق كفّك حوله بشكل مريح؛ المقبض السميك أكثر من اللازم يحوّل تمرين الصدر إلى تمرين قبضة، وهذا ليس الهدف. كل ما في هذه الصفحة يُشحن لكل محافظات مصر مع الدفع عند الاستلام، وبالجنيه المصري.',
    faqs: [
      {
        question: 'مثبت على الحائط أم مستقل؟',
        answer:
          'المثبت على الحائط أثبت ولا يأخذ مساحة أرضية، لكنه يحتاج حائطاً مصمتاً. المستقل يعمل في أي مكان ويمكن تحريكه، وهو الاختيار الصحيح للشقق الإيجار حيث لا يمكن الحفر.',
      },
      {
        question: 'ما المسافة المناسبة بين البارين؟',
        answer:
          'عرض الكتفين تقريباً أو أوسع قليلاً. الأوسع من ذلك يحمّل مفصل الكتف في وضع ضعيف. المسافة الدقيقة مذكورة في صفحة كل منتج — قِس كتفيك وقارن.',
      },
      {
        question: 'هل أستطيع استخدامه لتمارين أخرى؟',
        answer:
          'نعم. المتوازي يصلح للدِبس وتمرين L-sit وبدايات الفرونت ليفر وتمارين الثبات، والتجديف المقلوب لو كان الارتفاع مناسباً. هو من أكثر القطع فائدة بالنسبة للمساحة التي يشغلها.',
      },
    ],
  },

  'parallettes': {
    intro:
      'البارليتس أصغر قطعة معدات تُحدث فرقاً حقيقياً في ما يمكنك تدريبه. ترفع يديك عن الأرض، فيصبح وضع الرسغ محايداً ومريحاً، وتحصل على المسافة اللازمة لتمارين L-sit والبلانش والضغط العميق والوقوف على اليدين — وهي أشياء لا تسمح بها الأرض المستوية.\n\n' +
      'بارليتساتنا مصنوعة في مصر بمقبض خشبي وقاعدة معدنية. الخشب هنا لسبب: يظل دافئاً في اليد، ولا يصبح زَلِقاً مع العرق كما يحدث مع المعدن العاري، وألطف على الجلد في الجلسات الطويلة. والقاعدة عريضة بما يكفي حتى لا تميل تحت الحمل المتحرك، وهذا هو الفرق بين زوج تثق فيه وآخر تتوتر فوقه.\n\n' +
      'هي أسهل ما هنا في التخزين — تحت السرير أو خلف الباب — وأسهل ما يمكن اصطحابه في السفر. الأسعار بالجنيه المصري، والشحن لكل محافظات مصر مع الدفع عند الاستلام.',
    faqs: [
      {
        question: 'بارليتس منخفض أم مرتفع؟',
        answer:
          'المنخفض يناسب الضغط وL-sit وتمارين البلانش وهو أثبت. المرتفع يعطي مسافة أكبر للمهارات الأعمق. الأغلب ينبغي أن يبدأ بالمنخفض — الارتفاع الزائد لا يفيد إلا بعد بناء القوة.',
      },
      {
        question: 'هل تعمل على أي أرضية؟',
        answer:
          'ثابتة على السيراميك والخشب والخرسانة. على السجاد السميك أو المرتبة اللينة قد تغوص بشكل غير متساوٍ، وهو أمر يستحق الانتباه قبل تدريب الوقوف على اليدين.',
      },
      {
        question: 'هل تستحق الشراء لو عندي متوازي؟',
        answer:
          'نعم، لأنها لعمل مختلف. المتوازي للدِبس وتمارين الثبات على ارتفاع؛ والبارليتس لمهارات الأرض — البلانش وL-sit والضغط على اليدين. لا يُغني أحدهما عن الآخر.',
      },
    ],
  },

  'accessories': {
    intro:
      'القطع التي تُكمل التجهيز: حلق الجمباز والقبضات والأحزمة والأدوات الصغيرة التي تجعل باقي المعدات أكثر فائدة.\n\n' +
      'الحلق هو أصعب أدوات الكاليسثينكس وأكثرها فائدة. لأن لا شيء فيه ثابت، فكل تكرار يشغّل العضلات المثبِّتة التي يسمح لك البار الصلب بتجاهلها — ولهذا يبدو الدِبس والتجديف على الحلق أصعب بكثير من نفس الحركة على الحديد. علّقه من بار أو كمرة أو ستاند، واضبط الارتفاع في ثوانٍ.\n\n' +
      'كل ما في هذه الصفحة مختار ليعمل مع البارات والبارليتس التي نصنعها، لا منقولاً من كتالوج. لو لم تكن متأكداً من توافق قطعة مع ما تملكه، اسألنا قبل الطلب. الأسعار بالجنيه المصري والشحن لكل محافظات مصر مع الدفع عند الاستلام.',
    faqs: [
      {
        question: 'من أين أعلّق الحلق؟',
        answer:
          'من أي عقلة من عقلاتنا، أو كمرة صلبة، أو ستاند مصمم للأحمال المتحركة. لا تعلّقه من بار الباب الذي يُثبَّت بالضغط فقط — اتجاه الحمل مختلف وقد ينزلق.',
      },
      {
        question: 'حلق خشب أم بلاستيك؟',
        answer:
          'الخشب يعطي قبضة أفضل مع تعرّق اليد وهو المفضّل لأغلب من يتدرب في الداخل. البلاستيك أرخص ويتحمل البقاء في الخارج تحت الشمس والمطر.',
      },
      {
        question: 'هل أحتاج الحلق لو عندي عقلة؟',
        answer:
          'ليس في البداية. الحلق هو الخطوة التالية بعد أن تتوقف تمارين البار عن كونها صعبة — يأخذ نفس الحركات ويعيدها صعبة بإزالة الثبات.',
      },
    ],
  },
};

export function categoryCopy(key: CategoryKey, locale: 'en' | 'ar'): CategoryCopy {
  return locale === 'ar' ? CATEGORY_COPY_AR[key] : CATEGORY_COPY_EN[key];
}
