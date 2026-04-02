"use client";

import React, { useEffect, useRef, useState } from "react";

// STRONG ARABIC COPY OPTIONS //
// Option 1 (Used currently): "Demand exceeded expectations and quantities sold out. Returning strong in 7 days. Get ready."
// Option 2: "نفدت الكمية بالكامل بسبب الطلب الهائل. العودة بعد ٧ أيام." (Completely sold out due to massive demand. Return in 7 days.)
// Option 3: "لم يتبقَ شيء في المخزن. تجهزوا للإصدار القادم خلال ٧ أيام." (Nothing left in the warehouse. Get ready for the next drop in 7 days.)

const fullText = "الطلب فاق التوقعات ونفدت الكمية. نعود بقوة خلال ٧ أيام... تجهزوا.";

const Preorder: React.FC = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [displayedChars, setDisplayedChars] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    // Detect when section is in view
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isInView) {
                    setIsInView(true);
                }
            },
            { threshold: 0.3 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, [isInView]);

    // Typewriter effect
    useEffect(() => {
        if (!isInView || isComplete) return;

        const interval = setInterval(() => {
            setDisplayedChars((prev) => {
                if (prev >= fullText.length) {
                    setIsComplete(true);
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, 50); // Speed of typing (50ms per character)

        return () => clearInterval(interval);
    }, [isInView, isComplete]);

    // Split text into visible and shadow parts
    const visibleText = fullText.slice(0, displayedChars);
    const currentChar = fullText[displayedChars] || "";
    const remainingText = fullText.slice(displayedChars + 1);

    return (
        <section
            id="preorder-notice"
            ref={sectionRef}
            // Reduced mobile min-height, removed mobile bottom padding, and added negative bottom margin to pull it closer to Products
            className="w-full bg-stone-900 min-h-[150px] md:min-h-[40vh] flex items-center justify-center pt-12 pb-2 md:py-16 px-4 md:px-12 lg:px-20 -mb-10 sm:mb-0 z-10 relative"
        >
            <div className="w-full max-w-5xl mx-auto text-right" dir="rtl">
                {/* Reduced text size slightly across all breakpoints */}
                <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
                    {/* Visible typed text */}
                    <span>{visibleText}</span>

                    {/* Current character with blur/shadow effect */}
                    {!isComplete && currentChar && (
                        <span
                            className="inline-block transition-all duration-100"
                            style={{
                                color: "rgba(255, 255, 255, 0.3)",
                                textShadow: "0 0 20px rgba(255, 255, 255, 0.5)",
                                filter: "blur(2px)",
                            }}
                        >
                            {currentChar}
                        </span>
                    )}

                    {/* Remaining text - hidden but takes space for layout */}
                    <span className="opacity-0">{remainingText}</span>
                </h2>
            </div>
        </section>
    );
};

export default Preorder;
