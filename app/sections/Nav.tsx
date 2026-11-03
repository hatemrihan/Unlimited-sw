"use client";

/**
 * The store's nav (redesigned 3 Nov 2026, from Hatem's earlier "Target
 * Team" nav that he liked): a slim bar on top — our logo where it always
 * sat, and on the right MENU and CART as words — and MENU opens a full-screen
 * olive (#8A855E) menu, the links large and uppercase, sliding in one after
 * another, our Instagram / Facebook / TikTok underneath.
 *
 * WHY IT IS WRITTEN THIS WAY (what the old nav got wrong):
 *  · State drives the classes. The old one reached into the page with
 *    querySelector and swapped classes by hand after every render.
 *  · next/link, not `window.location.href = …`: going to Shop or About no
 *    longer reloads the whole site, and the pages are prefetched.
 *  · No "force every <video> to play on first touch": that hack also
 *    started a product's own video when you tapped anywhere on its page.
 *    The hero video already has autoPlay muted playsInline.
 *  · "Reviews" and "Get in touch" scroll when the section is on this page,
 *    and go to the home page's section when it is not — they used to do
 *    nothing at all on /shop, /cart, /about…
 *  · No motion library for one fade: plain CSS transitions.
 *  · Escape closes, the page under the menu does not scroll, the button says
 *    whether the menu is open, and the closed menu cannot be tabbed into.
 *  · MENU is a word in the bar beside CART (Hatem: "a texted menu beside
 *    the cart, a pretty gap between them"), not a round button.
 */

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useCallback, useEffect, useState } from "react";

import { useCart } from "../../contexts/CartContext";

/** The olive of the menu, from the Target Team nav. */
const OLIVE = "#8A855E";

/**
 * The menu. "Apply to coach" is here so every visitor can find it (Hatem,
 * 4 Nov 2026). Hash links are sections: "#contact" is the footer, on
 * almost every page; "#feedbackform" is the home page's reviews.
 */
const LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Apply to coach", href: "/coaches/apply" },
  { label: "About", href: "/about" },
  { label: "Reviews", href: "#feedbackform" },
  { label: "Get in touch", href: "#contact" },
] as const;

/** A section, found and scrolled to below the bar. */
function scrollToSection(hash: string, smooth = true): boolean {
  const target = document.getElementById(hash.replace(/^#/, ""));
  if (!target) return false;
  const top = target.getBoundingClientRect().top + window.scrollY - BAR_HEIGHT;
  window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  return true;
}

const SOCIAL = [
  { label: "Instagram", href: "https://www.instagram.com/unlimited.sw/" },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1AfmUmnj4f/?mibextid=wwXIfr",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@unlimited.sw?_t=ZS-8zZ5xMelNwX&_r=1",
  },
] as const;

/** Under the fixed bar when a link scrolls to a section. */
const BAR_HEIGHT = 96;

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { state: cart } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  const close = useCallback(() => setOpen(false), []);

  // Escape closes; the page under the menu stays where it was.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // A new page always starts with the menu closed.
  useEffect(close, [pathname, close]);

  // Arriving with "#feedbackform" from another page: the browser jumps
  // before the pictures above it have loaded, then they push the section
  // down and it lands in the wrong place, under the bar. Scroll once the
  // page is drawn, and once more when everything has loaded.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const first = window.setTimeout(() => scrollToSection(hash, false), 60);
    const again = () => scrollToSection(hash);
    if (document.readyState === "complete") {
      const late = window.setTimeout(again, 600);
      return () => {
        window.clearTimeout(first);
        window.clearTimeout(late);
      };
    }
    window.addEventListener("load", again, { once: true });
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("load", again);
    };
  }, [pathname]);

  /** Arabic pages have their own home and their own apply page. */
  const arabic = pathname === "/ar" || pathname.startsWith("/ar/");
  const local = (href: string) =>
    arabic && href.startsWith("/")
      ? href === "/"
        ? "/ar"
        : `/ar${href}`
      : href;

  /**
   * A section link works from any page: scroll to it when it is on this
   * page, otherwise go to the home page and land on it there.
   */
  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) {
      close();
      return; // next/link does the rest
    }
    e.preventDefault();
    close();
    if (document.getElementById(href.slice(1))) {
      // After the menu has faded, so the page can scroll again.
      window.setTimeout(() => scrollToSection(href), 250);
    } else {
      router.push(`${arabic ? "/ar" : "/"}${href}`);
    }
  };

  const ink = open ? "text-white" : "text-[#b3b3b3]";

  return (
    <>
      {/* The bar: logo and Cart only. */}
      <nav
        aria-label="Main"
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 transition-colors duration-300 md:px-10 md:py-5 ${
          open ? "" : "bg-transparent"
        }`}
        style={open ? { backgroundColor: OLIVE } : undefined}
      >
        {/* Where the logo always sat (Hatem, 3 Nov 2026: "I like its place
            before"): on the left of a phone (as on the desktop, so it never runs into MENU), 160px in on a desktop. */}
        <Link
          href={arabic ? "/ar" : "/"}
          aria-label="Unlimited — home"
          onClick={close}
          className="block shrink-0 ms-1 lg:ms-40"
        >
          <Image
            src="/images/Logo-image.png"
            alt=""
            width={1024}
            height={1024}
            priority
            sizes="(min-width: 768px) 96px, 72px"
            className={`h-[72px] w-auto object-contain brightness-0 invert transition-opacity duration-300 md:h-24 ${
              open ? "opacity-100" : "opacity-70 hover:opacity-100"
            }`}
          />
        </Link>

        <div className="ms-auto me-1 flex shrink-0 items-center gap-4 text-xs sm:gap-6 sm:text-sm md:me-8 md:gap-12">
          {/* Shop and Apply in plain sight, not only inside the menu (Hatem,
              4 Nov 2026: "it's important"). On a phone only APPLY, MENU and
              CART (Shop is inside the menu): "Apply" alone, so the
              bar still fits beside the logo. */}
          <Link
            href={local("/shop")}
            onClick={close}
            aria-current={pathname === local("/shop") ? "page" : undefined}
            className={`hidden uppercase tracking-wide md:inline transition-opacity hover:opacity-75 aria-[current=page]:underline aria-[current=page]:underline-offset-4 ${ink}`}
          >
            Shop
          </Link>
          <Link
            href={local("/coaches/apply")}
            onClick={close}
            aria-current={
              pathname === local("/coaches/apply") ? "page" : undefined
            }
            className={`uppercase tracking-wide transition-opacity hover:opacity-75 aria-[current=page]:underline aria-[current=page]:underline-offset-4 ${ink}`}
          >
            Apply<span className="hidden md:inline"> to coach</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            className={`cursor-pointer rounded-sm uppercase tracking-wide outline-none transition-opacity hover:opacity-75 focus-visible:ring-1 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent ${ink}`}
          >
            {open ? "Close" : "Menu"}
          </button>
          <Link
            href="/cart"
            onClick={close}
            className={`relative flex items-center gap-1.5 uppercase tracking-wide transition-opacity hover:opacity-75 ${ink}`}
          >
            Cart <span aria-hidden>→</span>
            {cart.itemCount > 0 && (
              <span
                className="ms-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-black"
                aria-label={`${cart.itemCount} in cart`}
              >
                {cart.itemCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* The full-screen menu. */}
      <div
        id="site-menu"
        inert={!open}
        className={`fixed inset-0 z-40 transition-[opacity,visibility] duration-500 ease-in-out ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
        style={{ backgroundColor: OLIVE }}
      >
        <div className="flex h-full flex-col justify-between px-6 pb-16 pt-32 md:px-12 md:pt-36">
          <ul className="space-y-3 text-right md:space-y-4">
            {LINKS.map(({ label, href }, i) => {
              const to = local(href);
              const here = to === pathname;
              return (
                <li
                  key={href}
                  className={`transition-[opacity,transform] duration-700 ease-out ${
                    open
                      ? "translate-x-0 opacity-100"
                      : "translate-x-8 opacity-0"
                  }`}
                  style={{
                    transitionDelay: open ? `${100 + i * 70}ms` : "0ms",
                  }}
                >
                  <Link
                    href={to}
                    onClick={(e) => go(e, href)}
                    aria-current={here ? "page" : undefined}
                    className={`inline-flex items-center gap-4 text-2xl font-normal uppercase tracking-tight text-white transition-opacity duration-300 hover:opacity-70 md:text-3xl lg:text-4xl ${
                      here ? "underline decoration-1 underline-offset-8" : ""
                    }`}
                  >
                    {label}
                    <span className="text-lg" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div
            className={`flex items-center justify-end gap-6 text-sm tracking-wide text-white transition-opacity delay-300 duration-700 md:text-base ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            {SOCIAL.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-70"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
