import { useEffect, useRef } from 'react';
import { stagger, useAnimate } from "motion/react";

const useTextRevealAnimationSimple = () => {
    const scopeRef = useRef<HTMLElement>(null);
    const [scope, animate] = useAnimate();

    useEffect(() => {
        if (scopeRef.current) {
            // Split text manually by spaces and wrap each word
            const text = scopeRef.current.textContent || '';
            const words = text.split(' ');

            // Clear current content and recreate with spans
            scopeRef.current.innerHTML = words
                .map(word => `<span class="word" style="display: inline-block; transform: translateY(100%); opacity: 0;">${word}</span>`)
                .join(' ');

            console.log('Text split successfully:', words.length, 'words');
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

export default useTextRevealAnimationSimple;


