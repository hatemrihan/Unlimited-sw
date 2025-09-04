"use client";

import React, { useEffect } from 'react';
import Nav from '../sections/Nav';
import useTextRevealAnimationSimple from '@/hooks/UsetextRevealAnimation-simple';
import { motion, useInView } from 'framer-motion';
import MovingWords from '../sections/MovingWords';
import Footer from '../sections/Footer';

const MohamedAlkadyProfile = () => {
  const {scope, entranceAnimation} = useTextRevealAnimationSimple();
  const inView = useInView(scope, { once: true, margin: "-50px" });

  useEffect(() => {
    if (inView) {
      entranceAnimation();
    }
  }, [inView, entranceAnimation]);
  return ( 
  <>
    <Nav />
    <motion.div
      className="min-h-screen bg-black flex items-center justify-center p-8 md:p-12"
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      transition={{duration: 0.3}}
    >
      <div className="relative w-full max-w-7xl">
        {/* Mobile/Tablet Vertical Layout */}
        <motion.div
          className="flex flex-col  gap-8 md:gap-12 lg:hidden"
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{duration: 0.8, delay: 0.2}}
        >
          {/* Text First - Centered */}
          <motion.div
            className="text-left"
            initial={{opacity: 0, x: -50}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.8, delay: 0.4}}
          >
            <h1 className="text-white text-3xl md:text-5xl font-light tracking-wider mt-20 mb-0 md:mb-6" ref={scope as React.RefObject<HTMLHeadingElement>}>
              WHO IS MOHAMED ALKADY?
            </h1>
            <h2 className="text-white text-2xl pl-10 md:text-4xl font-light tracking-wider">
                   WHO IS MOHAMED ALKADY?
            </h2>
          </motion.div>

          {/* Image Second - Centered */}
          <motion.div
            className="flex justify-center w-full"
            initial={{opacity: 0, scale: 0.9}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.8, delay: 0.6}}
          >
            <div className="relative w-full max-w-sm md:max-w-md">
              <motion.img
                src="/images/who-image.jpg"
                alt="Mohamed Alkady"
                className="w-full h-auto object-cover  shadow-xl"
                initial={{scale: 0.8}}
                animate={{scale: 1}}
                transition={{duration: 0.8, delay: 0.8}}
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              {/* Fallback content if image fails */}

            </div>
          </motion.div>

          {/* Hello World Last - Centered */}
          <motion.div
            className="text-center"
            initial={{opacity: 0, y: 50}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.8, delay: 1.0}}
          >
            <div className="text-white text-3xl md:text-5xl  tracking-wider">
             more words about moahmed...
            </div>
          </motion.div>
        </motion.div>

        {/* Desktop Horizontal Layout */}
        <motion.div
          className="hidden lg:grid lg:grid-cols-3 gap-20 items-center"
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{duration: 0.8, delay: 0.2}}
        >
          {/* Left Column - WHO IS MOHAMED ALKADY */}
          <motion.div
            className="text-left"
            initial={{opacity: 0, x: -50}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.8, delay: 0.4}}
          >
            <h1 className="text-white text-2xl font-light tracking-wider text-spacing-6 mb-9" ref={scope as React.RefObject<HTMLHeadingElement>}>
              WHO IS MOHAMED ALKADY?
            </h1>
            <h2 className="text-white pl-10  text-xl font-light tracking-wider">
              WHO IS MOHAMED ALKADY?
            </h2>
          </motion.div>

          {/* Middle Column - Image */}
          <motion.div
            className="flex justify-center"
            initial={{opacity: 0, scale: 0.9}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.8, delay: 0.6}}
          >
            <div className="relative w-full max-w-lg">
              <motion.img
                src="/images/who-image.jpg"
                alt="Mohamed Alkady"
                className="w-full h-auto object-cover "
                initial={{scale: 0.8}}
                animate={{scale: 1}}
                transition={{duration: 0.8, delay: 0.8}}
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />

            </div>
          </motion.div>

          {/* Right Column - Hello World */}
          <motion.div
            className="text-right flex items-center justify-end"
            initial={{opacity: 0, x: 50}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.8, delay: 1.0}}
          >
            <div className="text-white text-2xl  tracking-wider">
            mohamed alkady is...................
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
    <MovingWords />
    <Footer />
  </>
  );

};

export default MohamedAlkadyProfile;