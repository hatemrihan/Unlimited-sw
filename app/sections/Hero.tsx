"use client";
import { FC, useEffect, useState } from "react";
import Button from '@/components/Button';
import { motion, useInView } from "motion/react";
import useTextRevealAnimation from "@/hooks/UsetextRevealAnimation";
import React from "react";



const Alkady: FC = () => {
  const {scope, entranceAnimation} = useTextRevealAnimation();
  const heroRef = React.useRef(null);
  const isInView = useInView(heroRef, { once: true, margin: "-100px" });

  useEffect(()=>{
    entranceAnimation();
  },[entranceAnimation]);

  const handleClickMobileNavItem= (e:React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setIsOpen(false);
      const url = new URL(e.currentTarget.href);
      const hash = url.hash;
      const target = document.querySelector(hash);
      if (!target) return;
      target.scrollIntoView({behavior:'smooth'});
    }
    const [isOpen, setIsOpen] = useState(false);
    
   

  return <section className="bg-black" ref={heroRef}>
    <div className="grid md:grid-cols-12 md:h-screen items-stretch sticky top-0">
      <div className="md:col-span-7 flex flex-col justify-center">
        <div className="container !max-w-full">
      <motion.h1
      initial={{opacity: 0, y: 50 }}
      animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 50}}
      transition={{duration: 0.3, delay: 0.1}}
      className="text-4xl mt-34 md:text-5xl lg:text-5xl md:mt-0 text-center uppercase text-[#b3b3b3]"
      ref={scope as React.RefObject<HTMLHeadingElement>} >
     where is All in one place strenght Equipment, and calisthenics. 
      </motion.h1>
    </div>


    <div className="flex flex-col md:flex-row md:items-center mt-20  items-center gap-6 justify-center sm:items-center">
        <motion.div
 initial={{opacity: 0, y: 50}}
 animate={isInView ? {opacity:1, y:0} : {opacity: 0, y: 50}}
 transition={{duration: 0.2, delay: 0.2}}
        >
 <a href="#products" onClick={handleClickMobileNavItem}>
          <button className="inline-flex items-center px-6 py-3 bg-black border border-white text-white font-semibold hover:bg-white hover:text-black transition-all duration-300 group">
            <span className="text-gray-300 group-hover:text-black transition-colors duration-300">View Products</span>
            <div className="overflow-hidden w-5 h-5 ml-2">
              <div className="h-5 w-10 flex group-hover:-translate-x-1/2 transition-transform duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5"/>
                </svg>
              </div>
            </div>
          </button>
        </a>
        </motion.div>
        <motion.div
 initial={{opacity: 0, y: 50}}
 animate={isInView ? {opacity:1, y:0} : {opacity: 0, y: 50}}
 transition={{duration: 0.2, delay: 0.3}}
        >
 <a href="#contact" onClick={handleClickMobileNavItem}>
   <Button variant="text" className="text-[#b3b3b3] relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-white after:transition-all after:duration-300 hover:after:w-full">START NOW.</Button>
 </a>
        </motion.div>
      </div>
    </div>
    <motion.div
      className="md:col-span-5 relative"
      initial={{opacity: 0, x: 100}}
      animate={isInView ? {opacity:1, x:0} : {opacity: 0, x: 100}}
      transition={{duration: 0.3, delay: 0.2}}
    >
      <div className="mt-20 md:mt-0 md:size-full md:absolute md:right-0 max-md:!w-full">
        <video 
 src="/videos/intro.mp4" 
 autoPlay 
 muted 
 loop 
 playsInline
 className="size-full object-cover"
 onError={(e) => {
   console.error('Video failed to load:', e);
 }}
        />
      </div>
    </motion.div>
  </div>

</section>;
};


export default Alkady;