"use client";
import React, { FC } from "react";
import Image from "next/image";
import { translator } from '@/i18n';
import type { Locale } from '@/lib/locale';

const Hero: FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const tr = translator(locale);

  const handleClickMobileNavItem = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const url = new URL(e.currentTarget.href);
    const hash = url.hash;
    const target = document.querySelector(hash);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section className="relative w-full h-[100svh] md:h-[80vh] md:mt-[80px] bg-stone-900 overflow-hidden font-sans tracking-tight">

      {/*
        The page's only <h1>, carried in a visually-hidden span.

        The hero is a full-bleed image and video with no headline in the design,
        which leaves the homepage with no <h1> at all — the one heading Google
        weighs most, and the first thing a screen reader looks for. Rendering it
        sr-only keeps the design exactly as drawn while giving both what they
        need. Do not delete this without putting a visible <h1> somewhere on the
        page.
      */}
      <h1 className="sr-only">{tr('hero.headline')}</h1>


      {/* Background Image — mobile vs desktop */}
      {/* Mobile image (visible below md) */}
      <div className="absolute inset-0 md:hidden">
        <Image
          src="/images/newmobile-image.JPG"
          fill
          priority
          alt="Unlimited fitness equipment"
          className="object-cover"
          sizes="100vw"
        />
      </div>
      {/* Desktop/laptop video (visible at md and above) */}
      <div className="absolute inset-0 hidden md:flex items-center justify-center md:p-12">
        <video
          src="/videos/main.mov"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover rounded-2xl"
        />
      </div>

      {/* Bottom Content — like the reference */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-10 md:px-12 md:pb-14">



        {/* SHOP NOW — mobile only */}
        <div className="flex justify-center md:hidden">
          <a
            href="#products"
            onClick={handleClickMobileNavItem}
            className="text-white text-sm tracking-[0.25em] uppercase border-b border-white pb-1 hover:opacity-70 transition-opacity duration-300"
          >
            Be Unlimited.
          </a>
        </div>
      </div>

    </section>
  );
};

export default Hero;