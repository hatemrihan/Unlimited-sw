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
    "NEED IT NOW?SAME/NEXT DAY DELIVERY IS HERE!"
  ];

  return (
    <motion.div
      className="w-full overflow-hidden bg-stone-100 text-black py-3 relative -mt-1"
      ref={wordsRef}
      initial={{opacity: 0}}
      animate={isInView ? {opacity: 1} : {opacity: 0}}
      transition={{duration: 0.3, delay: 0.1}}
    >
      {/* Single seamless marquee */}
      <div className="flex whitespace-nowrap animate-marquee-infinite">
        {/* Create multiple instances with different words */}
        {[...Array(3)].map((_, setIndex) => (
          words.map((word, wordIndex) => (
            <div
              key={`${setIndex}-${wordIndex}`}
              className="min-w-max text-black font-bold flex-shrink-0 mx-2 flex items-center text-sm sm:text-base md:text-lg font-sans uppercase"
            >
            {/* Order Icon SVG */}
            <svg 
                className="w-4 h-4 mr-2 flex-shrink-0" 
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M6.976 3.5a2.75 2.75 0 0 0-2.72 2.347l-.662 4.46a8.75 8.75 0 0 0-.094 1.282v1.661a3.25 3.25 0 0 0 3.25 3.25h6.5a3.25 3.25 0 0 0 3.25-3.25v-1.66c0-.43-.032-.858-.095-1.283l-.66-4.46a2.75 2.75 0 0 0-2.72-2.347h-6.05Zm-1.237 2.567a1.25 1.25 0 0 1 1.237-1.067h6.048c.62 0 1.146.454 1.237 1.067l.583 3.933h-2.484a1.25 1.25 0 0 0-1.185.855l-.159.474a.25.25 0 0 1-.237.171h-1.558a.25.25 0 0 1-.237-.17l-.159-.475a1.25 1.25 0 0 0-1.185-.855h-2.484l.583-3.933Zm-.738 5.433-.001.09v1.66c0 .966.784 1.75 1.75 1.75h6.5a1.75 1.75 0 0 0 1.75-1.75v-1.75h-2.46l-.1.303a1.75 1.75 0 0 1-1.66 1.197h-1.56a1.75 1.75 0 0 1-1.66-1.197l-.1-.303h-2.46Z"/>
              </svg>
              <span className="tracking-wide font-bold">{word}</span>
              {/* Order Icon SVG */}
              <svg 
                className="w-4 h-4 ml-2 flex-shrink-0" 
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M6.976 3.5a2.75 2.75 0 0 0-2.72 2.347l-.662 4.46a8.75 8.75 0 0 0-.094 1.282v1.661a3.25 3.25 0 0 0 3.25 3.25h6.5a3.25 3.25 0 0 0 3.25-3.25v-1.66c0-.43-.032-.858-.095-1.283l-.66-4.46a2.75 2.75 0 0 0-2.72-2.347h-6.05Zm-1.237 2.567a1.25 1.25 0 0 1 1.237-1.067h6.048c.62 0 1.146.454 1.237 1.067l.583 3.933h-2.484a1.25 1.25 0 0 0-1.185.855l-.159.474a.25.25 0 0 1-.237.171h-1.558a.25.25 0 0 1-.237-.17l-.159-.475a1.25 1.25 0 0 0-1.185-.855h-2.484l.583-3.933Zm-.738 5.433-.001.09v1.66c0 .966.784 1.75 1.75 1.75h6.5a1.75 1.75 0 0 0 1.75-1.75v-1.75h-2.46l-.1.303a1.75 1.75 0 0 1-1.66 1.197h-1.56a1.75 1.75 0 0 1-1.66-1.197l-.1-.303h-2.46Z"/>
              </svg>
            </div>
          ))
        )).flat()}
      </div>
    </motion.div>
  )
}

export default MovingWordsTwo