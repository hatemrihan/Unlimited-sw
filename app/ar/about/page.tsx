import type { Metadata } from 'next';

import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { alternatesFor, absoluteUrl } from '@/lib/locale';
import { personJsonLd } from '@/lib/aboutSchema';

export const metadata: Metadata = {
  title: { absolute: 'من نحن — Unlimited SW | أجهزة كاليسثينكس صناعة مصرية' },
  description:
    'Unlimited SW تصمم وتصنّع أجهزة الكاليسثينكس في مصر. أسسها د. محمد القاضي، دكتوراه في الميكانيكا الحيوية للتدريب الرياضي وأكثر من ١٤ عاماً في التدريب.',
  alternates: alternatesFor('/about', '/ar/about', 'ar'),
  openGraph: {
    title: 'من نحن — Unlimited SW',
    url: absoluteUrl('/ar/about'),
    type: 'website',
    locale: 'ar_EG',
  },
};

export default function ArabicAboutPage() {
  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(personJsonLd('ar'))}
      </script>

      <Nav />
      <div className="min-h-screen bg-stone-900 text-[#b3b3b3] font-sans flex flex-col">
        <main className="flex-1 w-full max-w-[900px] mx-auto px-6 md:px-12 pt-32 pb-24">

          <h1 className="text-3xl md:text-5xl leading-tight font-medium text-white mb-12">
            نصنع أجهزة الكاليسثينكس في مصر.
          </h1>

          <div className="space-y-6 text-base leading-relaxed">
            <p>
              Unlimited SW ليست متجراً يستورد ويعيد البيع. نحن نصمم ونلحّم ونطلي كل قطعة
              في ورشتنا في مصر، ونبيعها مباشرة لمن سيتدرب عليها.
            </p>
            <p>
              أسّس العلامة <strong className="text-white">د. محمد القاضي</strong>، الحاصل على
              دكتوراه في الميكانيكا الحيوية للتدريب الرياضي، وصاحب أكثر من أربعة عشر عاماً في
              تدريب الرياضيين. هذا هو الفارق العملي: المقاسات هنا ليست منقولة عن كتالوج،
              بل مختارة بناءً على كيفية تحرك الجسم فعلاً — المسافة بين البار والحائط، وقُطر
              المقبض، والمسافة بين بارات المتوازي.
            </p>
            <p>
              نصنع في مصر لسببين. الأول أن الشحن الدولي لقطعة من الحديد يكلف أكثر من الحديد
              نفسه، وهي تكلفة يدفعها العميل بلا مقابل. والثاني أننا نستطيع تغيير التصميم في
              نفس الأسبوع الذي نكتشف فيه مشكلة، وهذا لا يمكن فعله مع مورّد في الخارج.
            </p>
            <p>
              إن لم تكن متأكداً من القطعة المناسبة لك أو لمساحتك، تواصل معنا قبل الشراء.
              نفضّل أن نبيعك القطعة الصحيحة مرة واحدة على أن نتعامل مع إرجاع.
            </p>
            <p className="text-white/60 text-sm pt-6">
              تصميم وتصنيع في مصر. شحن لكل المحافظات، الدفع عند الاستلام.
            </p>
          </div>

        </main>
        <Footer />
      </div>
    </>
  );
}
