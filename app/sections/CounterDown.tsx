"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useInView } from "motion/react";

interface CounterDownProps {
  initialActive?: boolean;
  initialExpiresAt?: string | null;
  initialApplyToAll?: boolean;
}

const CounterDown = ({ initialActive, initialExpiresAt, initialApplyToAll }: CounterDownProps) => {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<boolean>(Boolean(initialActive));
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt ?? null);
  const [applyToAll, setApplyToAll] = useState<boolean>(initialApplyToAll ?? true);
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!initialActive || !initialExpiresAt) return 0;
    const diff = new Date(initialExpiresAt).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  });

  const wordsRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(wordsRef, { once: true, margin: "-50px" });

  useEffect(() => {
    setMounted(true);

    // If initialActive was not passed, fetch dynamically
    if (initialActive === undefined) {
      fetch("/api/free-shipping")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.active && data.expiresAt) {
            const diff = new Date(data.expiresAt).getTime() - Date.now();
            if (diff > 0) {
              setActive(true);
              setExpiresAt(data.expiresAt);
              if (typeof data.applyToAll === 'boolean') {
                setApplyToAll(data.applyToAll);
              }
              setTimeLeft(diff);
            } else {
              setActive(false);
            }
          } else {
            setActive(false);
          }
        })
        .catch(() => {
          setActive(false);
        });
    }
  }, [initialActive]);

  useEffect(() => {
    if (!active || !expiresAt) return;

    const targetTime = new Date(expiresAt).getTime();
    const interval = setInterval(() => {
      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        setActive(false);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [active, expiresAt]);

  // If SSR or offer is inactive or expired, render nothing (no dead space)
  if (!mounted || !active || timeLeft <= 0) {
    return null;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const countdownText = `${days > 0 ? `${days}d ` : ""}${hours
    .toString()
    .padStart(2, "0")}h : ${minutes.toString().padStart(2, "0")}m : ${seconds
    .toString()
    .padStart(2, "0")}s`;

  return (
    <motion.div
      className="w-full overflow-hidden bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border-y border-neutral-800 text-white py-3 relative z-20 shadow-sm"
      ref={wordsRef}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Infinite Marquee */}
      <div className="flex whitespace-nowrap animate-marquee-infinite">
        {[...Array(12)].map((_, index) => (
          <div
            key={index}
            className="text-xs sm:text-sm tracking-wider uppercase font-medium min-w-max flex-shrink-0 mx-6 sm:mx-10 flex items-center gap-3 text-white"
          >
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
              FREE SHIPPING
            </span>
            <span className="text-gray-300">
              {applyToAll ? "All Governorates Free Shipping Offer Ends In:" : "Selected Products Free Shipping Ends In:"}
            </span>
            <span className="font-mono text-amber-400 font-bold tracking-normal">
              {countdownText}
            </span>
            <span className="text-gray-400 text-xs normal-case">
              (Applied automatically at checkout)
            </span>
            <span className="text-neutral-700 select-none mx-2">•</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default CounterDown;