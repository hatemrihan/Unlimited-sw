/**
 * The product's details as hairline sections (rebuilt 4 Nov 2026).
 *
 * Native <details>: opens and closes with no script and no animation
 * library, works with the keyboard and screen readers, and its text is in
 * the page for Google even while closed. Only sections that have text are
 * drawn — no "this information will be available once the admin adds
 * content" placeholders.
 */

import type { Product } from "@/product/model";
import { translator } from "@/i18n";
import type { Locale } from "@/lib/locale";
import { localized, localizedFaqs } from "@/product/seo";

export default function ProductDetailsTabs({
  product,
  locale = "en",
}: {
  product: Product;
  locale?: Locale;
}) {
  const tr = translator(locale);
  const specifications = localized(product, "specifications", locale).trim();
  const detailed = localized(product, "detailedDescription", locale).trim();
  const shipping = product.shippingInfo?.trim() ?? "";
  const faqs = localizedFaqs(product, locale);

  const sections = [
    detailed && { id: "description", label: tr("product.description"), body: <Text>{detailed}</Text> },
    specifications && { id: "specs", label: tr("product.specifications"), body: <Text>{specifications}</Text> },
    shipping && { id: "shipping", label: tr("product.shipping"), body: <Text>{shipping}</Text> },
    faqs.length > 0 && {
      id: "faqs",
      label: tr("product.faqs"),
      body: (
        <dl className="space-y-4">
          {faqs.map((f: { question: string; answer: string }, i: number) => (
            <div key={i}>
              <dt className="text-sm text-stone-200">{f.question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-stone-400">{f.answer}</dd>
            </div>
          ))}
        </dl>
      ),
    },
  ].filter(Boolean) as { id: string; label: string; body: React.ReactNode }[];

  if (sections.length === 0) return null;

  return (
    <div className="mt-10 border-b border-white/10">
      {sections.map((s) => (
        <details key={s.id} className="group border-t border-white/10">
          <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-xs uppercase tracking-widest text-stone-300 transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
            {s.label}
            <span aria-hidden className="text-base leading-none text-stone-500 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="pb-6">{s.body}</div>
        </details>
      ))}
    </div>
  );
}

function Text({ children }: { children: string }) {
  return (
    <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-stone-400">
      {children}
    </p>
  );
}
