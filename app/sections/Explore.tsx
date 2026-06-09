'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
// FULL QUALITY IMAGES - No compression or quality loss!
import oneImage from '@/public/images/all-grayy/1763900966157-avnq5qjndt.png';
import twoImage from '@/public/images/all-grayy/1763901202402-bdlfhcw2tbu.png';

// 🔥 CACHE BUSTER - Change this number to force browser refresh: v2.0
const COMPONENT_VERSION = '2.0';

const Explore = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [sliderPos, setSliderPos] = useState(50); // Percentage (0-100)

    // Handle slider drag
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.isPrimary === false) return;
        if (!containerRef.current) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();

        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (moveEvent.isPrimary === false) return;
            const x = moveEvent.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            setSliderPos(percentage);
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };
    return (
        <section
            key={`explore-${COMPONENT_VERSION}`}
            className="relative w-full min-h-screen flex items-center py-16 sm:py-20 lg:py-0 bg-stone-900"
            data-version={COMPONENT_VERSION}
        >
            {/* 
        TWO-COLUMN LAYOUT: Left = Heading, Right = Image Slider
        🔥 Cache version: {COMPONENT_VERSION} - This forces fresh content!
      */}
            <div className="w-full max-w-[1800px] mx-auto px-8 lg:px-12 xl:px-16">

                {/* Grid Layout: 2 columns on desktop - Text Left, Images Right */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* LEFT COLUMN - TEXT/INFO */}
                    <div className="order-1 lg:order-1">
                        {/* PRODUCT DESCRIPTION - Shows on DESKTOP */}
                        <div className="hidden lg:flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
                            <h1 className="text-6xl text-white font-normal leading-tight tracking-tight text-center">
                                Worth the Buy.
                            </h1>

                            <h2 className="text-2xl font-light text-[#b3b3b3] text-center">
                                Wall-mounted pull-up bar +Wall-parallel bar
                            </h2>
                            <p className="text-2xl font-light text-white text-center">
                                5400 LE
                            </p>
                            <Link
                                href="/product/69df958953ccc60ae476918d"
                                className="w-full py-3 text-sm font-medium tracking-wide transition-colors bg-white hover:bg-white/90 text-black flex items-center justify-center"
                            >
                                Buy Now
                            </Link>
                            <div className="space-y-2 text-xs text-white/50 text-center max-w-sm">
                                <p className="font-medium text-white/70">GRAY/BLACK.</p>
                                <p>Wall-parallel bar support made of strong 3 mm heavy-duty steel with high-quality paint finish.</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - IMAGE SLIDER */}
                    <div className="order-2 lg:order-2">
                        <div
                            ref={containerRef}
                            className="relative w-full h-[45vh] sm:h-[50vh] lg:h-[60vh] overflow-hidden select-none rounded-lg"
                            style={{ touchAction: 'none' }}
                        >
                            {/* Right Image (Background - Full Quality, Full Image Visible) */}
                            <div className="absolute inset-0 w-full h-full">
                                <Image
                                    src={twoImage}
                                    alt="After"
                                    fill
                                    className="object-contain"
                                    quality={100}
                                    priority
                                />
                            </div>

                            {/* Left Image (Overlay - Full Quality with clip, Full Image Visible) */}
                            <div
                                className="absolute inset-0 w-full h-full"
                                style={{
                                    clipPath: `inset(0 ${100 - sliderPos}% 0 0)`
                                }}
                            >
                                <Image
                                    src={oneImage}
                                    alt="Before"
                                    fill
                                    className="object-contain"
                                    quality={100}
                                    priority
                                />
                            </div>

                            {/* Slider Line */}
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10"
                                style={{ left: `${sliderPos}%` }}
                                onPointerDown={handlePointerDown}
                            >
                                {/* Slider Handle */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                    <div className="flex gap-1">
                                        <div className="w-0.5 h-4 bg-black"></div>
                                        <div className="w-0.5 h-4 bg-black"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PRODUCT DESCRIPTION - Shows on MOBILE (below image) */}
                        <div className="lg:hidden flex flex-col items-center justify-center space-y-3 mt-6 max-w-sm mx-auto px-4">
                            <h2 className="text-xl font-light text-[#b3b3b3] text-center">
                                Wall-mounted pull-up bar +Wall-parallel bar
                            </h2>
                            <p className="text-xl font-light text-white text-center">
                                4,999 LE
                            </p>
                            <Link
                                href="/product/69df958953ccc60ae476918d"
                                className="w-full py-2.5 text-xs font-medium tracking-wide transition-colors bg-white hover:bg-white/90 text-black flex items-center justify-center"
                            >
                                Buy Now
                            </Link>
                            <div className="space-y-1 text-[10px] text-white/50 text-center max-w-xs">
                                <p className="font-medium text-white/70">GRAY/BLACK.</p>
                                <p>Wall-parallel bar support made of strong 3 mm heavy-duty steel with high-quality paint finish.</p>
                            </div>
                        </div>
                    </div>



                </div>
            </div>
        </section>
    );
}

export default Explore;