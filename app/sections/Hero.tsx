"use client";
import React, { FC } from "react";
import Image from "next/image";

const Hero: FC = () => {

  const handleClickMobileNavItem = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const url = new URL(e.currentTarget.href);
    const hash = url.hash;
    const target = document.querySelector(hash);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section className="relative w-full h-[100svh] md:h-[80vh] bg-black overflow-hidden font-sans tracking-tight">

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
      <div className="absolute inset-0 hidden md:flex items-center justify-center">
        <video
          src="/videos/main.mov"
          autoPlay
          loop
          muted
          playsInline
          className="max-w-full max-h-full object-contain scale-[0.8]"
        />
      </div>

      {/* Bottom Content — like the reference */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-10 md:px-12 md:pb-14">



        {/* SHOP NOW — centered */}
        <div className="flex justify-center">
          <a
            href="#products"
            onClick={handleClickMobileNavItem}
            className="text-white text-sm md:text-base tracking-[0.25em] uppercase border-b border-white pb-1 hover:opacity-70 transition-opacity duration-300"
          >
            Be Unlimited.
          </a>
        </div>
      </div>

    </section>
  );
};

export default Hero;