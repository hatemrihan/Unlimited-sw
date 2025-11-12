'use client'

import React from 'react'
import { motion, useInView } from 'framer-motion'

const MovingWordsTwo = () => {
  const wordsRef = React.useRef(null);
  const isInView = useInView(wordsRef, { once: true, margin: "-50px" });

  // Array of different words to display
  const words = [
    "SALE NOW",
    "UNLIMITED",
    "EXPLORE OUR EQUIPMENTS",
    "NEW EQUIPMENT"
  ];

  return (
    <motion.div
      className="w-full overflow-hidden  text-[#b3b3b3] py-3 relative mt-8"
      ref={wordsRef}
      initial={{opacity: 0}}
      animate={isInView ? {opacity: 1} : {opacity: 0}}
      transition={{duration: 0.3, delay: 0.1}}
    >
      {/* Seamless infinite marquee with enough copies */}
      <div className="flex whitespace-nowrap animate-marquee-infinite">
        {/* Create many instances to ensure continuous scrolling without gaps */}
        {[...Array(20)].map((_, setIndex) => (
          words.map((word, wordIndex) => (
            <div
              key={`${setIndex}-${wordIndex}`}
              className="min-w-max text-[#b3b3b3] font-bold flex-shrink-0 mx-8 flex items-center text-sm sm:text-base md:text-lg font-sans uppercase"
            >
              <span className="tracking-wide font-bold">{word}</span>
            </div>
          ))
        )).flat()}
      </div>
    </motion.div>
  )
}

export default MovingWordsTwo