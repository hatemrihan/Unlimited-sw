"use client";

import React, { useEffect } from 'react';
import Nav from '../sections/Nav';
import useTextRevealAnimationSimple from '@/hooks/UsetextRevealAnimation-simple';
import { motion, useInView } from 'framer-motion';
import MovingWords from '../sections/MovingWords';
import Footer from '../sections/Footer';
import Image from 'next/image';
import whoImage from '../../public/images/who-image.jpg';
import Button from '@/components/Button';

const MohamedwhoProfile = () => {
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
    <section className="min-h-screen bg-black  text-white  pt-16 lg:pt-20 w-full overflow-x-hidden transition-colors duration-300">
        <div className="w-full px-4 sm:px-6 py-8 lg:py-24">
          {/* Hero Text */}
          <div className="text-center mb-8 lg:mb-16 w-full">
            <motion.h1 
              className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black uppercase leading-none mb-4 lg:mb-8 w-full"
              style={{ 
                letterSpacing: '0.05em',
                wordBreak: 'keep-all',
                overflowWrap: 'normal'
              }}
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              WHO ARE WE?
            </motion.h1>
            
            <motion.h2 
              className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold uppercase tracking-wider mb-4 lg:mb-8"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              THE END OF LIMITS.
            </motion.h2>
            
            <motion.div 
              className="max-w-4xl mx-auto mb-8 lg:mb-12 px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <p className="text-xs sm:text-sm lowercase md:text-base lg:text-lg leading-relaxed mb-6 lg:mb-8 text-white/80  px-2 sm:px-0">
              Mohamed Dedicated and dynamic sports science professional with a Ph.D. in Biomechanics in
Sports Training and more than 14 years of coaching experience. Lecturer at the Faculty
of Sports Sciences, Benha University, Department of Gymnastics and Exercises – Sports
Training Specialization. Founder of Gravity benha for Calisthenics training. Active
calisthenics coach and athlete, currently coaching at multiple locations and specializes in
the training and development of professional athletes,. In addition to coaching, has
delivered lectures and workshops in various institutions on training load planning and
periodization. Involved in ongoing scientific research and academic publishing in the
fields of sports training and biomechanics, with a strong focus on advancing practical and
Name theoretical knowledge in calisthenics and gymnastics.
              </p>
              
              <a href="/shop">
              <motion.button 
                className="inline-flex items-center px-6 py-3 lg:px-8 lg:py-4 bg-black border border-white text-white font-semibold  hover:bg-white hover:text-black transition-all duration-300 text-sm lg:text-base group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
               OUR EQUIPMENTS
               <div className="w-5 h-5 lg:w-6 lg:h-6 overflow-hidden ml-2">
                 <div className="w-10 h-5 lg:w-12 lg:h-6 flex transition-transform duration-300 group-hover:-translate-x-1/2">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0">
                     <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                   </svg>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0">
                     <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                   </svg>
                 </div>
               </div>
              </motion.button>
              </a>
            </motion.div>
          </div>

          {/* Image Section */}
          <motion.div 
            className="mb-12 lg:mb-16"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {/* Enhanced Image Container */}
            <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden 
                           
                           p-6 lg:p-8 shadow-2xl shadow-blue-500/10 dark:shadow-blue-500/20">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/40">
                <Image
                  width={1000}
                  height={1000}
                  src={whoImage}
                  alt="who-Image"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    <MovingWords />
    <Footer />
  </>
  );

};

export default MohamedwhoProfile;