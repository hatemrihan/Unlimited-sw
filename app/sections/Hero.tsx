"use client";
import React, { FC, useEffect, useState } from "react";
import Image from "next/image";
import { translator } from '@/i18n';
import type { Locale } from '@/lib/locale';

import oneImage from '../../public/images/one-image.jpg'
import twoImage from '../../public/images/two-image.jpg'
import threeImage from '../../public/images/three-image.jpg'
import fourImage from '../../public/images/four-image.jpg'
import aboutImage from '../../public/images/about-image.jpg'


const HeaderTypewriter = ({ text, delay = 0, speed = 40, className = '' }: { text: string, delay?: number, speed?: number, className?: string }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, delay, speed]);

  // The whole headline sits underneath, invisible: it holds the final size
  // from the first paint (so nothing below jumps while letters arrive) and
  // puts the real words in the HTML for search engines and screen readers.
  // The typing is drawn on top of it and hidden from screen readers.
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="invisible">{text}</span>
      <span aria-hidden="true" className="absolute inset-0">{displayedText}</span>
    </span>
  );
};

const Hero: FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const tr = translator(locale);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates to range [-1, 1] for central origin
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    // For touch devices (optional infinite drag feeling)
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const x = (touch.clientX / window.innerWidth - 0.5) * 2;
      const y = (touch.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const handleClickMobileNavItem = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const url = new URL(e.currentTarget.href);
    const hash = url.hash;
    const target = document.querySelector(hash);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth' });
  }

  // Strictly placed on the corners/edges to NEVER obscure the center.
  // The 'speed' affects the parallax amount, simulating 3D depth in all vectors Z, X, Y
  const floatingElements = [
    // Top Left Zone
    { src: oneImage, top: '5%', left: '5%', width: '12vw', speed: 1.5, zIndex: 10, type: 'image' },
    { src: '/images/one-compressed.mp4', type: 'video', top: '30%', left: '15%', width: '10vw', speed: 3.2, zIndex: 5 },
    // Bottom Left Zone
    { src: twoImage, top: '60%', left: '8%', width: '14vw', speed: 2.1, zIndex: 15, type: 'image' },
    // Top Right Zone
    { src: threeImage, top: '8%', left: '75%', width: '13vw', speed: 2.8, zIndex: 12, type: 'image' },
    { src: '/images/two.mp4', type: 'video', top: '78%', left: '40%', width: '12vw', speed: 1.4, zIndex: 8 },
    { src: fourImage, top: '32%', left: '85%', width: '9vw', speed: 0.9, zIndex: 6, type: 'image' },
    // Bottom Right Zone
    { src: aboutImage, top: '65%', left: '72%', width: '16vw', speed: 1.7, zIndex: 20, type: 'image' },
  ];

  return (
    <section className="relative w-full h-[100svh] bg-stone-900 overflow-hidden flex items-center justify-center font-sans tracking-tight" style={{ perspective: '1200px' }}>

      {/* 3D Scattered Parallax Image Layer */}
      <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
        {floatingElements.map((elem, i) => {
          // Calculate movement in X and Y, plus a scaling depth trick to feel 3D
          const moveX = mousePos.x * elem.speed * -35;
          const moveY = mousePos.y * elem.speed * -35;
          const rotateX = mousePos.y * elem.speed * 5;
          const rotateY = mousePos.x * elem.speed * -5;

          return (
            <div
              key={i}
              className="absolute overflow-hidden rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-out"
              style={{
                top: elem.top,
                left: elem.left,
                width: elem.width,
                minWidth: '80px',
                aspectRatio: '3/4',
                zIndex: elem.zIndex,
                transform: `translate3d(${moveX}px, ${moveY}px, ${elem.speed * 40}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              }}
            >
              {elem.type === 'video' ? (
                <video src={elem.src as string} autoPlay loop muted playsInline preload="none" className="w-full h-full object-cover" />
              ) : (
                <Image src={elem.src as any} fill sizes="(max-width: 768px) 30vw, 15vw" alt="" className="object-cover" />
              )}
            </div>
          );
        })}
      </div>

      {/* Foreground Content (Safe Zone) */}
      <div className="relative z-50 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto h-full pointer-events-none">

        <h1 className="text-[2rem] sm:text-[2.5rem] md:text-[2.5rem] lg:text-[3.5rem] leading-[1.2] font-medium tracking-tight text-white mb-8 md:mb-12 uppercase drop-shadow-2xl whitespace-pre-line">
          <HeaderTypewriter
            text={tr('hero.headline')}
            delay={300}
            speed={70}
          />
          {/* Cursor pulse */}
          <span className="animate-pulse ml-2 font-light opacity-60">|</span>
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-6 justify-center pointer-events-auto">
          <a href="#products" onClick={handleClickMobileNavItem}>
            <button className="inline-flex items-center px-5 py-2.5 bg-white border border-white text-black font-semibold hover:bg-transparent hover:text-white transition-all duration-300 group rounded-full">
              <span className="tracking-widest uppercase text-[10px] md:text-sm">{tr('hero.viewProducts')}</span>
              <div className="overflow-hidden w-4 h-4 ml-2">
                <div className="h-4 w-8 flex group-hover:-translate-x-1/2 transition-transform duration-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5" />
                  </svg>
                </div>
              </div>
            </button>
          </a>

          <a href="#contact" onClick={handleClickMobileNavItem}>
            <button className="px-4 py-2 text-[#b3b3b3] hover:text-white transition-colors tracking-widest text-[10px] md:text-sm relative uppercase after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-white after:transition-all after:duration-300 hover:after:w-full">
              START NOW.
            </button>
          </a>
        </div>
      </div>

    </section>
  );
};

export default Hero;
