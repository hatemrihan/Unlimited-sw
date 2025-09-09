"use client";

import {useInView, motion } from "motion/react";

import { FC, useEffect, useRef } from "react";
import useTextRevealAnimation from "@/hooks/UsetextRevealAnimation";
import Image from "next/image";
import oneImage from '../../public/images/one-image.jpg'
import twoImage from '../../public/images/two-image.jpg'
import threeImage from '../../public/images/three-image.jpg'
import fourImage from '../../public/images/four-image.jpg'
import whoImage from '../../public/images/who-image.jpg'



const Mohamed: FC = () => {
// const [scope, animate] = useAnimate();
const sectionRef= useRef<HTMLElement>(null);
const {scope, entranceAnimation} = useTextRevealAnimation();
  const inView = useInView(scope, {
    once: true,
  });
  useEffect (()=> {
if (inView) {
  entranceAnimation();
}
  },[inView]);
  return (
    <section className="bg-black py-16 md:py-20 lg:py-24" id="intro" ref={sectionRef}>
      <div className="container mx-auto px-8 md:px-16 lg:px-24 bg-black">
        <div className="max-w-5xl mx-auto bg-black" >
          {/* Main Title - Matching the image exactly */}
          <h1 className="text-4xl md:text-7xl lg:text-8xl xl:text-9xl font-normal text-white mb-12 md:mb-16 lg:mb-20 leading-[0.9] tracking-tight text-left">
            Who is Mohamed Alkady?
          </h1>
          
          {/* Description - Single paragraph like in the image */}
          <div className="text-center bg-black">
            <p className="text-sm md:text-xl lg:text-2xl text-[#b3b3b3] leading-relaxed max-w-4xl mx-auto font-light bg-black">
              Mohamed is a dedicated and dynamic sports science professional with a Ph.D. in Biomechanics in 
              Sports Training and more than 14 years of coaching experience. Lecturer at the Faculty 
              of Sports Sciences, Benha University, Department of Gymnastics and Exercises – Sports 
              Training Specialization. Founder of Gravity Benha for Calisthenics training. Active 
              calisthenics coach and athlete, currently coaching at multiple locations and specializes in 
              the training and development of professional athletes. In addition to coaching, has 
              delivered lectures and workshops in various institutions on training load planning and 
              periodization. Involved in ongoing scientific research and academic publishing in the 
              fields of sports training and biomechanics, with a strong focus on advancing practical and 
              theoretical knowledge in calisthenics and gymnastics.
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Scrolling Gallery */}
      <div className="gallery-container">
        <div className="gallery-scroll">
          <div className="gallery-item">
            <Image 
              src={oneImage} 
              alt="Calisthenics Equipment" 
              width={400}
              height={220}
              className="gallery-image"
              priority
            />
          </div>
          <div className="gallery-item">
            <Image 
            src={twoImage} 
              alt="Training Equipment" 
              width={400}
              height={220}
              className="gallery-image"
            />
          </div>
          <div className="gallery-item">
    
            <Image 
              src={threeImage} 
              alt="Training Gear" 
              width={400}
              height={220}
              className="gallery-image"
            />
          </div>
          <div className="gallery-item">
            <Image 
              src={fourImage} 
              alt="Accessories" 
              width={400}
              height={220}
              className="gallery-image"
            />
          </div>
          <div className="gallery-item">
            <Image 
              src={whoImage} 
              alt="Featured Products" 
              width={400}
              height={220}
              className="gallery-image"
            />
          </div>
        </div>
        

        {/* Gmail Contact Button */}
        <div className="flex justify-center mt-8 mb-4">
          <motion.a
            href="mailto:Muhamed.alkady@gmail.com"
            className="group relative px-6 py-3 
              font-bold uppercase tracking-wider text-xs sm:text-sm text-white
              hover:bg-white hover:text-black
              transition-all duration-300
              border-2 border-white
              shadow-lg hover:shadow-xl
              transform hover:-translate-y-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h.98L12 10.09l9.384-6.269h.98c.904 0 1.636.732 1.636 1.636z"/>
              </svg>
              <span>Gmail</span>
            </span>
          </motion.a>
        </div>
      </div>

      <style jsx>{`
        .gallery-container {
          width: 100%;
          margin: 1rem 0;
          padding: 0 1rem;
          background: black;
        }

        .gallery-scroll {
          display: flex;
          gap: 1.5rem;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 1rem 0;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          background: black;
        }

        .gallery-scroll::-webkit-scrollbar {
          display: none;
        }

        .gallery-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .gallery-item {
          flex-shrink: 0;
          width: 400px;
          height: 450px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          scroll-snap-align: center;
          cursor: grab;
        }

        .gallery-item:active {
          cursor: grabbing;
        }

        .gallery-item:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
        }

        .gallery-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
          transition: transform 0.4s ease !important;
        }

        .gallery-item:hover .gallery-image {
          transform: scale(1.05) !important;
        }

        @media (max-width: 768px) {
          .gallery-item {
            width: 320px;
            height: 320px;
          }
          
          .gallery-container {
            padding: 0 0.5rem;
          }
          
          .gallery-scroll {
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .gallery-item {
            width: 280px;
            height: 320px;
          }
        }
      `}</style>
    </section>
  );
};

export default Mohamed;
