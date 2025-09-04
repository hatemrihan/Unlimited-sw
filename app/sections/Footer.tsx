"use client";

import { FC, useEffect, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import useTextRevealAnimation from "@/hooks/UsetextRevealAnimation";
import { motion, useInView } from "motion/react";
import React from "react";



const navItems = [
  {
    href: '/about',
    label: 'About',
    isExternal: false
  },
  {
    href: '/shop',
    label: 'Shop',
    isExternal: false
  },
  {
    href: '/#intro',
    label: 'Our Athletes',
    isExternal: false
  },
 
  {
    href: '/policy',
    label: 'POLICY',
    isExternal: false
  },
  {
    href: 'https://www.instagram.com/muhamed.alkady?igsh=MWJtZnV3bncyZnFtcA==',
    label: 'Instagram',
    isExternal: true
  },
]
const Footer: FC = () => {
  const router = useRouter();
  const {scope, entranceAnimation} = useTextRevealAnimation();
  const footerRef = React.useRef(null);
  const isInView = useInView(footerRef, { once: true, margin: "-100px" });

  useEffect(()=>{
    if (isInView){
      entranceAnimation();
    }
  }, [isInView, entranceAnimation]);
  const handleClickNavItem = (e:MouseEvent<HTMLAnchorElement>, isExternal: boolean, href: string) => {
    if (isExternal) return; // Let external links work normally

    e.preventDefault();

    if (href.startsWith('/#')) {
      // Handle home page hash links - navigate to home then scroll
      const hash = href.substring(1); // Remove the leading /
      router.push('/');
      setTimeout(() => {
        const target = document.querySelector(hash);
        if (target) {
          const headerHeight = 80;
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    } else if (href.startsWith('#')) {
      // Handle current page hash links
      const target = document.querySelector(href);
      if (target) {
        const headerHeight = 80;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    } else if (href.startsWith('/')) {
      // Handle internal routes - use Next.js router
      router.push(href);
    }
  }
  return (
    <footer className="bg-stone-100 text-black py-12 lg:py-16" id="contact" ref={footerRef}>
      {/* Main Footer Content */}
      <motion.div
        className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12"
        initial={{opacity: 0}}
        animate={isInView ? {opacity: 1} : {opacity: 0}}
        transition={{duration: 0.8, delay: 0.2}}
      >
        {/* Status Indicator */}
        <motion.div
          className="flex items-center gap-3 mb-4"
          initial={{opacity: 0, x: -30}}
          animate={isInView ? {opacity: 1, x: 0} : {opacity: 0, x: -30}}
          transition={{duration: 0.3, delay: 0.1}}
        >
          <div className="w-3 h-3 rounded-full bg-gray-600 animate-pulse flex-shrink-0 "></div>
          <span className="uppercase text-sm font-medium tracking-wider">UNLIMITED</span>
        </motion.div>

        {/* Main Content - iPhone Style Layout */}
        <motion.div
          className="space-y-6"
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 30}}
          transition={{duration: 0.3, delay: 0.2}}
        >
          {/* Main Heading */}
          <motion.h2
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light leading-tight"
            initial={{opacity: 0, y: 30}}
            animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 30}}
            transition={{duration: 0.3, delay: 0.3}}
          >
            BUY FROM US  TRAIN WITH US.
          </motion.h2>

          {/* Email Button */}
          <motion.div
            className="pt-2"
            initial={{opacity: 0, y: 20}}
            animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 20}}
            transition={{duration: 0.3, delay: 0.4}}
          >
            <a
              href="mailto:alkady@gmail.com?subject=Contact"
              className="inline-block"
            >
              <motion.div
                initial={{scale: 0.9}}
                animate={isInView ? {scale: 1} : {scale: 0.9}}
                transition={{duration: 0.3, delay: 0.5}}
              >
                <Button
                  variant="secondary"
                  className="text-base lg:text-lg px-6 py-3 lg:px-8 lg:py-4 bg-black text-white  hover:bg-white hover:text-black transition-all duration-300"
                  iconAfter={
                    <div className="w-5 h-5 lg:w-6 lg:h-6 overflow-hidden">
                      <div className="w-10 h-5 lg:w-12 lg:h-6 flex transition-transform duration-300 group-hover/button:-translate-x-1/2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                        </svg>
                      </div>
                    </div>
                  }
                >
                  alkady@gmail.com
                </Button>
              </motion.div>
            </a>
          </motion.div>

          {/* Navigation - iPhone Style */}
          <motion.div
            className="pt-8"
            initial={{opacity: 0, y: 20}}
            animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 20}}
            transition={{duration: 0.3, delay: 0.6}}
          >
            <nav className="flex flex-col gap-4">
              {navItems.map(({href, label, isExternal}, index) => (
                <motion.div
                  key={label}
                  initial={{opacity: 0, y: 15}}
                  animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 15}}
                  transition={{duration: 0.2, delay: 0.7 + index * 0.1}}
                >
                  <a
                    href={href}
                    onClick={(e) => handleClickNavItem(e, isExternal, href)}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="group"
                  >
                    <Button
                      variant="text"
                      className="text-base lg:text-lg hover:text-stone-500 transition-colors duration-300 px-0 py-2 lg:px-0 lg:py-3 relative group cursor-pointer"
                    >
                      {label}
                      {/* Underline Animation */}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
                    </Button>
                  </a>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Copyright */}
      <motion.div
        className="border-t border-white/10 mt-12 lg:mt-16"
        initial={{opacity: 0}}
        animate={isInView ? {opacity: 1} : {opacity: 0}}
        transition={{duration: 0.3, delay: 0.8}}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.p
            className="text-black/50 text-sm text-center"
            initial={{opacity: 0, y: 20}}
            animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 20}}
            transition={{duration: 0.3, delay: 0.9}}
          >
            Copyright  UNLIMITED ™&bull; All rights reserved
          </motion.p>
        </div>
      </motion.div>
    </footer>
  );
};

export default Footer;