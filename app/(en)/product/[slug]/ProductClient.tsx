"use client";

/**
 * The product page (rebuilt 4 Nov 2026 — Hatem: "no box … a hundred times
 * better … in Arabic too").
 *
 * WHAT IT IS: the pictures on the left, whole and edge to edge, no grey
 * frames; on the right a calm column that stays in view while the pictures
 * scroll — name, price, whether it is in stock, the options, quantity, Buy it
 * now, Add to cart, how you can pay, then the details as hairline sections.
 * Below, other products. Nothing sits in a box.
 *
 * WHAT CHANGED UNDER IT:
 *  · Every word comes from the dictionary: the Arabic page used to say
 *    "Color", "Quantity", "Add to cart", "Buy it now", "MIGHT ALSO LIKE",
 *    "Added to cart!" and "Only 3 left in stock" in English.
 *  · Nothing invented: a details section with no text is not drawn (it used
 *    to open on "This information will be available once the admin adds
 *    content"); the payment line is the shop's real switches.
 *  · No animation library. The page used to slide every block in with
 *    motion/react — script the phone had to download and run before the
 *    page settled. Plain CSS now.
 *  · Thumbnails are small images (they were the full-size photos).
 *  · Prices are formatted the same on the server and the phone (the bare
 *    toLocaleString() could differ and flash on load).
 *  · "Added to cart" is said under the button, with a way to the cart —
 *    not a box in the corner that vanished.
 *  · Related products are links (a long-press opens them; Google follows
 *    them) and carry their Arabic names on the Arabic page.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Footer from "@/app/sections/Footer";
import Nav from "@/app/sections/Nav";
import { track } from "@/analytics/client/track";
import { useCart } from "@/contexts/CartContext";
import { translator } from "@/i18n";
import type { Locale } from "@/lib/locale";
import { CATEGORIES, categorySlug, type CategoryKey } from "@/product/categories";
import type { Product } from "@/product/model";
import { localized, productPath } from "@/product/seo";

import ProductDetailsTabs from "./ProductDetailsTabs";

type Variant = { name: string; stock: number; price?: number; images?: string[] };

export interface ShopPayments {
  cod: boolean;
  instapay: boolean;
}

interface Props {
  product: Product;
  relatedProducts: Product[];
  locale?: Locale;
  /** The shop's payment switches, read on the server; omitted = not shown. */
  payments?: ShopPayments;
}

const isVideoUrl = (url: string) =>
  /\.(mp4|mov|avi|webm)(\?|$)/i.test(url) || url.includes("video/upload");

/** "2,000" on the server and on every phone alike. */
const money = (n: number) => Math.round(n).toLocaleString("en-US");

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""));

export default function ProductClient({
  product,
  relatedProducts,
  locale = "en",
  payments,
}: Props) {
  const tr = translator(locale);
  const name = localized(product, "name", locale);
  const summary = localized(product, "description", locale);
  const router = useRouter();
  const { addItem } = useCart();
  const gallery = useRef<HTMLDivElement>(null);

  const [variant, setVariant] = useState<Variant | null>(
    product.variants?.length ? product.variants[0] : null,
  );
  const [quantity, setQuantity] = useState(1);
  const [shown, setShown] = useState(0);
  /** What the last press did, said under the buttons. */
  const [said, setSaid] = useState<{ kind: "added" | "refused"; text: string } | null>(null);

  const stock = variant ? variant.stock : product.stock;
  const price = variant?.price && variant.price > 0 ? variant.price : product.price;
  const soldOut = stock <= 0;
  const currency = tr("product.currency");

  const media = useMemo(() => {
    const pictures = variant?.images?.length
      ? variant.images
      : [product.mainImage, ...(product.images || [])].filter(Boolean);
    return [...pictures, ...(product.videos || [])];
  }, [variant, product.mainImage, product.images, product.videos]);

  // One "looked at this product" per visit, not one per option clicked.
  useEffect(() => {
    if (!product._id) return;
    track("ViewContent", {
      productId: product._id,
      productName: product.name,
      value: product.price,
      currency: "EGP",
      source: "client",
    });
  }, [product._id, product.name, product.price]);

  // A message about the last press fades after a few seconds.
  useEffect(() => {
    if (!said) return;
    const id = window.setTimeout(() => setSaid(null), said.kind === "added" ? 6000 : 4500);
    return () => window.clearTimeout(id);
  }, [said]);

  const add = useCallback(() => {
    const result = addItem(
      {
        id: product._id!,
        name: product.name,
        image: product.mainImage,
        price,
        stock,
        variant: variant ? { name: variant.name } : undefined,
      },
      quantity,
      stock,
    );
    if (!result.added) {
      setSaid({
        kind: "refused",
        text: result.remaining > 0
          ? fill(tr("product.cartLimit"), { n: result.remaining })
          : tr("product.cartAll"),
      });
    }
    return result.added;
  }, [addItem, product._id, product.name, product.mainImage, price, stock, variant, quantity, tr]);

  const addToCart = () => {
    if (add()) setSaid({ kind: "added", text: tr("product.addedToCart") });
  };
  // A refused add never sends anyone to pay for something not in the cart.
  const buyNow = () => {
    if (add()) router.push("/checkout");
  };

  const goTo = (i: number) => {
    const el = gallery.current;
    if (!el) return;
    // scrollLeft runs negative in a right-to-left page.
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollTo({ left: dir * i * el.clientWidth, behavior: "smooth" });
    setShown(i);
  };
  const onScroll = () => {
    const el = gallery.current;
    if (el) setShown(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };

  const pickVariant = (v: Variant) => {
    setVariant(v);
    setQuantity(1);
    setShown(0);
    gallery.current?.scrollTo({ left: 0 });
  };

  const category = product.category as CategoryKey | undefined;
  const shopPath = locale === "ar" ? "/ar/shop" : "/shop";
  const payWays = [
    payments?.cod && tr("product.payCod"),
    payments?.instapay && tr("product.payInstapay"),
  ].filter(Boolean) as string[];
  const others = relatedProducts.filter((p) => p._id !== product._id).slice(0, 4);
  const discounted = !!(product.discount && product.discount > 0 && product.originalPrice);

  const status = soldOut
    ? { text: product.customOutOfStockMessage || tr("product.outOfStock"), dot: "bg-stone-500" }
    : stock <= 5
      ? { text: fill(tr("product.onlyLeft"), { n: stock }), dot: "bg-amber-400" }
      : { text: tr("product.inStock"), dot: "bg-emerald-400" };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-stone-900 text-stone-300">
        <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-28 sm:px-8 lg:pt-36">
          {/* Where you are */}
          <nav aria-label="Breadcrumb" className="mb-8 text-xs text-stone-500">
            <Link href={shopPath} className="hover:text-stone-200">
              {tr("breadcrumb.shop")}
            </Link>
            {category && CATEGORIES[category] && (
              <>
                <span className="mx-2">/</span>
                <Link
                  href={`${shopPath}/${categorySlug(category, locale)}`}
                  className="hover:text-stone-200"
                >
                  {locale === "ar" ? CATEGORIES[category].ar : CATEGORIES[category].en}
                </Link>
              </>
            )}
          </nav>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-20">
            {/* ── The pictures ─────────────────────────────────────────── */}
            <section aria-label={name}>
              <div
                ref={gallery}
                onScroll={onScroll}
                className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {media.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className="relative aspect-[4/5] w-full shrink-0 snap-start"
                  >
                    {isVideoUrl(src) ? (
                      <video
                        src={src}
                        controls
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={src}
                        alt={media.length > 1 ? `${name} — ${fill(tr("product.photo"), { n: i + 1, total: media.length })}` : name}
                        fill
                        sizes="(min-width: 1024px) 640px, 100vw"
                        priority={i === 0}
                        loading={i === 0 ? undefined : "lazy"}
                        className="object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>

              {media.length > 1 && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
                    {media.map((src, i) => (
                      <button
                        key={`t-${i}`}
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={fill(tr("product.photo"), { n: i + 1, total: media.length })}
                        aria-current={i === shown}
                        className={`relative h-16 w-[52px] shrink-0 transition-opacity ${
                          i === shown ? "opacity-100" : "opacity-40 hover:opacity-80"
                        }`}
                      >
                        {isVideoUrl(src) ? (
                          <span className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-wide text-stone-300">
                            ▶ {tr("product.video")}
                          </span>
                        ) : (
                          <Image src={src} alt="" fill sizes="52px" className="object-cover" />
                        )}
                        <span
                          className={`absolute inset-x-0 -bottom-1.5 h-px ${i === shown ? "bg-white" : "bg-transparent"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="ms-auto shrink-0 text-xs tabular-nums text-stone-500" aria-live="polite">
                    {shown + 1} / {media.length}
                  </span>
                </div>
              )}
            </section>

            {/* ── What it is, and buying it ────────────────────────────── */}
            <section className="lg:sticky lg:top-32 lg:self-start">
              <h1 className="text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl">
                {name}
              </h1>

              <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xl text-white tabular-nums">
                  {money(price)} {currency}
                </span>
                {discounted && (
                  <>
                    <span className="text-sm text-stone-500 line-through tabular-nums">
                      {money(product.originalPrice!)} {currency}
                    </span>
                    <span className="text-sm text-[#b5af84]">
                      −{product.discount}% {tr("product.off")}
                    </span>
                  </>
                )}
              </p>

              <p className="mt-3 flex items-center gap-2 text-sm text-stone-400">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
                <span dir="auto">{status.text}</span>
              </p>

              {summary && (
                <p className="mt-6 max-w-prose whitespace-pre-line text-[15px] leading-relaxed text-stone-400">
                  {summary}
                </p>
              )}

              <div className="mt-8 border-t border-white/10 pt-6">
                {/* Options: words, the chosen one underlined */}
                {!!product.variants?.length && (
                  <div className="mb-6">
                    <p className="mb-2 text-xs uppercase tracking-widest text-stone-500">
                      {tr("product.option")}
                    </p>
                    <div role="radiogroup" aria-label={tr("product.option")} className="flex flex-wrap gap-x-5 gap-y-2">
                      {product.variants.map((v) => {
                        const on = variant?.name === v.name;
                        return (
                          <button
                            key={v.name}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => pickVariant(v)}
                            className={`text-sm underline-offset-[6px] transition-colors ${
                              on ? "text-white underline decoration-1" : "text-stone-400 hover:text-white"
                            } ${v.stock <= 0 ? "line-through decoration-stone-600" : ""}`}
                          >
                            {v.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                {!soldOut && (
                  <div className="mb-8 flex items-center gap-5">
                    <span className="text-xs uppercase tracking-widest text-stone-500">
                      {tr("product.quantity")}
                    </span>
                    <div className="flex items-center gap-4 text-white">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="−"
                        className="text-lg leading-none disabled:text-stone-600"
                      >
                        −
                      </button>
                      <span className="w-6 text-center tabular-nums" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(q + 1, Math.max(1, stock)))}
                        disabled={quantity >= stock}
                        aria-label="+"
                        className="text-lg leading-none disabled:text-stone-600"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Buying */}
                {soldOut ? (
                  <p className="text-sm text-stone-500">{tr("product.outOfStock")}</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <button
                      type="button"
                      onClick={buyNow}
                      className="h-12 w-full bg-white text-sm font-semibold uppercase tracking-widest text-stone-900 transition-colors hover:bg-stone-200"
                    >
                      {tr("product.buyNow")}
                    </button>
                    <button
                      type="button"
                      onClick={addToCart}
                      className="self-center text-sm uppercase tracking-widest text-white underline decoration-1 underline-offset-[6px] transition-opacity hover:opacity-70"
                    >
                      {tr("product.addToCart")}
                    </button>
                  </div>
                )}

                <p role="status" aria-live="polite" className="mt-4 min-h-5 text-center text-sm">
                  {said?.kind === "added" && (
                    <span className="text-emerald-300">
                      {said.text} ·{" "}
                      <Link href="/cart" className="text-white underline underline-offset-4">
                        {tr("product.viewCart")} →
                      </Link>
                    </span>
                  )}
                  {said?.kind === "refused" && <span className="text-amber-300">{said.text}</span>}
                </p>

                {payWays.length > 0 && (
                  <p className="mt-4 text-center text-xs text-stone-500">{payWays.join(" · ")}</p>
                )}
              </div>

              <ProductDetailsTabs product={product} locale={locale} />
            </section>
          </div>

          {/* ── Other products ──────────────────────────────────────────── */}
          {others.length > 0 && (
            <section className="mt-28">
              <h2 className="mb-8 text-xs uppercase tracking-widest text-stone-500">
                {tr("product.youMightLike")}
              </h2>
              <ul className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4">
                {others.map((p) => (
                  <li key={String(p._id)}>
                    <Link href={productPath(p, locale)} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden">
                        {p.mainImage && !isVideoUrl(p.mainImage) && (
                          <Image
                            src={p.mainImage}
                            alt={localized(p, "name", locale)}
                            fill
                            sizes="(min-width: 640px) 25vw, 50vw"
                            loading="lazy"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        )}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-stone-200">
                        {localized(p, "name", locale)}
                      </p>
                      <p className="mt-1 text-sm text-stone-500 tabular-nums">
                        {money(p.price)} {currency}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
