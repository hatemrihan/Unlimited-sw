import { useEffect, useRef } from 'react';
import { stagger, useAnimate } from "motion/react";
import SplitType from "split-type";

const useTextRevealAnimation = () => {
    const scopeRef = useRef<HTMLElement>(null);
    const [scope, animate] = useAnimate();

    useEffect(() => {
        if (scopeRef.current) {
            try {
                // Split text into words for animation
                const splitText = new SplitType(scopeRef.current, {
                    types: "words",
                    tagName: "span"
                });

                // Add word class for animation targeting
                const words = scopeRef.current.querySelectorAll('.word');
                words.forEach((word, index) => {
                    word.classList.add('word');
                    // Set initial state for animation
                    (word as HTMLElement).style.transform = 'translateY(100%)';
                    (word as HTMLElement).style.opacity = '0';
                });

                console.log('Text split successfully:', words.length, 'words');
            } catch (error) {
                console.error('Error splitting text:', error);
            }
        }
    }, []);

    const entranceAnimation = () => {
        if (scopeRef.current) {
            const words = scopeRef.current.querySelectorAll('.word');
            console.log('Running entrance animation on', words.length, 'words');
            return animate(
                words,
                { transform: "translateY(0px)", opacity: 1 },
                { duration: 0.2, delay: stagger(0.05) }
            );
        }
    };

    const exitAnimation = () => {
        if (scopeRef.current) {
            const words = scopeRef.current.querySelectorAll('.word');
            return animate(
                words,
                { transform: 'translateY(100%)', opacity: 0 },
                {
                    duration: 0.05,
                    delay: stagger(-0.02)
                }
            );
        }
    };

    return {
        scope: scopeRef,
        entranceAnimation,
        exitAnimation
    };
};

export default useTextRevealAnimation;