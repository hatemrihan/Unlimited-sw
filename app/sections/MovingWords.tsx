'use client'

import React from 'react'
import { motion, useInView } from 'framer-motion'

const MovingWords = () => {
  const wordsRef = React.useRef(null);
  const isInView = useInView(wordsRef, { once: true, margin: "-50px" });

  return (
    <motion.div
      className="w-full overflow-hidden  text-[#b3b3b3] py-3 relative"
      ref={wordsRef}
      initial={{opacity: 0}}
      animate={isInView ? {opacity: 1} : {opacity: 0}}
      transition={{duration: 0.3, delay: 0.1}}
    >
      {/* Single seamless marquee */}
      <div className="flex whitespace-nowrap animate-marquee-infinite">
        {/* Create enough instances for seamless infinite loop */}
        {[...Array(20)].map((_, index) => (
          <div
            key={index}
            className="text-sm sm:text-base md:text-lg min-w-max text-[#b3b3b3] font-light flex-shrink-0 mx-8 sm:mx-12 flex items-center "
          >
            <span className="mr-3 ">™</span>
            <span className="tracking-wider font-bold">UNLIMITED</span>
            <span className="ml-3">™</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default MovingWords