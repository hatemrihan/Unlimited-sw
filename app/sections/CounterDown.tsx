"use client";
import { motion, useInView } from "framer-motion";
import React from "react";
import { useEffect,useState } from "react";


const CounterDown =() =>{
    const wordsRef = React.useRef(null);
    const isInView = useInView(wordsRef, { once: true, margin: "-50px" });
    const buildTime = Number(process.env.NEXT_PUBLIC_BUILD_TIME);
    const endTime = buildTime + 2 * 24 *60 * 60 *1000; // 2 days
    const [timeLeft, setTimeLeft] = useState(endTime - Date.now());

useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(endTime - Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (timeLeft <= 0) {
    return <div>Offer Finished ⏳</div>;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <>
  
    <motion.div
    className="w-full  overflow-hidden bg-white text-black py-6 relative"
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
          className="text-xl sm:text-base md:text-lg min-w-max text-black font-light flex-shrink-0 mx-8 sm:mx-12 flex flex-col items-center justify-center"
        >
            <h2 className="text-base text-center whitespace-nowrap font-normal">
              Black Friday Offer Ends In: <span className="ml-2">{days}d : {hours}h : {minutes}m : {seconds}s</span>
            </h2>
            <h1 className="text-xl text-center whitespace-nowrap mt-2 font-normal">
              Use code: <span className="text-blue-800">BLACKFRIDAY</span>  to get Shipping Free on your order!
            </h1>
        </div>
        
      ))}

    </div>
  </motion.div>

  </>
  );
}; 
export default CounterDown;