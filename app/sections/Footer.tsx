"use client";

/**
 * The store's footer (redesigned 4 Nov 2026, from Hatem's Target Team
 * footer that he liked), in OUR colours (Hatem: "pick another colour instead of blue … we have our branding"): the menu's olive (#8A855E) with warm white (#fafaf9), the name
 * on the left, Pages / Follow on the right, the copyright line with "Made
 * by CrazyDeveloper." (that is Hatem), and the giant faint wordmark at the
 * bottom. Our links, our email, our socials.
 *
 * `id="contact"` stays: the nav's "Get in touch" scrolls here on any page.
 *
 * Lighter than the old one: no motion library, no reveal hook, no router
 * clicks — plain links (next/link prefetches the pages), so the footer
 * costs nothing until somebody scrolls to it.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const EMAIL = "be.unlimited.sw@gmail.com";

const PAGES = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Become a coach", href: "/coaches/apply" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

const LEGAL = [
  { label: "Privacy policy", href: "/policy" },
  { label: "Terms of service", href: "/terms" },
] as const;

const FOLLOW = [
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

/** Pages that also exist in Arabic, under /ar. */
const HAS_ARABIC = new Set([
  "/",
  "/shop",
  "/coaches/apply",
  "/about",
  "/contact",
]);

const LINK =
  "transition-all underline-offset-4 hover:text-stone-900 hover:underline";
const HEAD =
  "mb-4 text-[13px] font-medium uppercase tracking-wide text-[#fafaf9]/80";

export default function Footer() {
  const pathname = usePathname() ?? "/";
  const arabic = pathname === "/ar" || pathname.startsWith("/ar/");
  const local = (href: string) =>
    arabic && HAS_ARABIC.has(href)
      ? href === "/"
        ? "/ar"
        : `/ar${href}`
      : href;
  const year = new Date().getFullYear();

  return (
    <footer
      id="contact"
      className="relative w-full overflow-hidden bg-[#8A855E] pt-20 font-sans text-[#fafaf9] md:pt-28 lg:pt-32"
    >
      <div className="mx-auto max-w-[1400px] px-8 md:px-14">
        {/* Top: the name and the email, then the link columns. */}
        <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-6">
            <h2 className="max-w-md text-2xl font-normal leading-[1.3] tracking-tight sm:text-3xl lg:text-[34px]">
              Unlimited.
            </h2>
            <p className="mt-3 max-w-sm text-[15px] text-[#fafaf9]/80">
              Buy from us. Train with us.
            </p>
            <a
              href={`mailto:${EMAIL}?subject=contact`}
              className={`mt-6 inline-flex items-center gap-2 text-[15px] ${LINK}`}
            >
              {EMAIL} <span aria-hidden>↗</span>
            </a>
          </div>

          <div className="flex flex-wrap justify-start gap-x-16 gap-y-10 md:col-span-6 md:justify-end lg:gap-x-24">
            <nav aria-label="Pages">
              <p className={HEAD}>Pages</p>
              <ul className="space-y-2.5 text-[15px]">
                {PAGES.map(({ label, href }) => (
                  <li key={href}>
                    <Link href={local(href)} className={LINK}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Follow">
              <p className={HEAD}>Follow</p>
              <ul className="space-y-2.5 text-[15px]">
                {FOLLOW.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LINK}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Legal">
              <p className={HEAD}>Legal</p>
              <ul className="space-y-2.5 text-[15px]">
                {LEGAL.map(({ label, href }) => (
                  <li key={href}>
                    <Link href={href} className={LINK}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Middle: copyright and the maker. */}
        <div className="mt-16 flex flex-col items-start justify-between gap-2 border-b border-[#fafaf9]/30 pb-6 text-[13px] text-[#fafaf9]/85 sm:flex-row sm:items-center md:mt-24">
          <p>© Copyright {year} Unlimited. All rights reserved.</p>
          <a
            href="https://tomm.one"
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors hover:text-stone-900 sm:pr-12 md:pr-24 lg:pr-36"
          >
            Made by CrazyDeveloper.
          </a>
        </div>
      </div>

      {/* Bottom: the giant faint wordmark, every letter whole. "UNLIMITED"
          is nine letters to TARGET's six, so it is sized to fit the width. */}
      <div
        aria-hidden
        className="pointer-events-none w-full select-none overflow-hidden pb-8 pt-6 md:pb-14 md:pt-10"
      >
        <div className="flex w-full items-center justify-center px-4 sm:px-6">
          <span className="block whitespace-nowrap text-center text-[15vw] font-black leading-none tracking-tighter text-white/[0.14]">
            UNLIMITED
            <span className="ml-1 align-top text-[6vw] font-bold md:ml-2">
              ™
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}
