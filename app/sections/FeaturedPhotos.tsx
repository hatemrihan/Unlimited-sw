'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

/**
 * The featured product's photos: two = a before/after slider the visitor
 * drags (mouse, finger or arrow keys); one = the photo alone.
 */
export default function FeaturedPhotos({ images, alt }: { images: string[]; alt: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [first, second] = images;

  const frame = 'relative w-full h-[45vh] sm:h-[50vh] lg:h-[60vh] overflow-hidden select-none rounded-lg';
  const photo = (src: string, eager: boolean) => (
    <Image src={src} alt={alt} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 50vw" priority={eager} />
  );

  if (!second) return <div className={frame}>{photo(first, true)}</div>;

  const drag = (e: React.PointerEvent) => {
    if (!e.isPrimary || !box.current) return;
    const rect = box.current.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      if (!ev.isPrimary) return;
      setPos(Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div ref={box} className={frame} style={{ touchAction: 'none' }} dir="ltr">
      <div className="absolute inset-0">{photo(second, false)}</div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {photo(first, true)}
      </div>
      <div
        role="slider"
        aria-label={alt}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        tabIndex={0}
        onPointerDown={drag}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5));
          if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5));
        }}
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 outline-none"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
          <div className="flex gap-1">
            <div className="w-0.5 h-4 bg-black" />
            <div className="w-0.5 h-4 bg-black" />
          </div>
        </div>
      </div>
    </div>
  );
}
