"use client";

import React, { useEffect, useState } from "react";

interface CounterDownProps {
  initialActive?: boolean;
  initialExpiresAt?: string | null;
  initialApplyToAll?: boolean;
}

const CounterDown = ({ initialActive, initialExpiresAt, initialApplyToAll }: CounterDownProps) => {
  const [active, setActive] = useState<boolean>(Boolean(initialActive));
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt ?? null);
  const [applyToAll, setApplyToAll] = useState<boolean>(initialApplyToAll ?? true);
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!initialActive || !initialExpiresAt) return 0;
    const diff = new Date(initialExpiresAt).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  });

  // Client-side fetch on mount to sync with latest admin updates
  useEffect(() => {
    fetch("/api/free-shipping")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.active && data.expiresAt) {
          const diff = new Date(data.expiresAt).getTime() - Date.now();
          if (diff > 0) {
            setActive(true);
            setExpiresAt(data.expiresAt);
            if (typeof data.applyToAll === "boolean") {
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
        // fail safe
      });
  }, []);

  // Countdown timer interval
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

  // If offer is inactive or expired, render nothing
  if (!active || timeLeft <= 0) {
    return null;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <section className="w-full py-16 md:py-24 px-4 flex justify-center items-center select-none" dir="rtl">
      <div className="max-w-2xl mx-auto text-center flex flex-col items-center">

        {/* Title */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-red-500 tracking-tight mb-2">
          {applyToAll
            ? "شحن مجاني لجميع المحافظات"
            : "شحن مجاني على الموازي الخشب"}
        </h2>

        {/* Subtitle */}
        <p className="text-red-400/90 text-sm sm:text-base font-medium mb-6">
          ينتهي العرض خلال:
        </p>

        {/* Centered Countdown - Pure Red Text */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 font-mono text-red-500 font-black" dir="ltr">
          {days > 0 && (
            <>
              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl md:text-5xl leading-none">
                  {days.toString().padStart(2, "0")}
                </span>
                <span className="mt-2 text-xs sm:text-sm font-sans font-medium text-red-400">
                  يوم
                </span>
              </div>
              <span className="text-2xl sm:text-3xl text-red-500/50 -mt-5">:</span>
            </>
          )}

          <div className="flex flex-col items-center">
            <span className="text-3xl sm:text-4xl md:text-5xl leading-none">
              {hours.toString().padStart(2, "0")}
            </span>
            <span className="mt-2 text-xs sm:text-sm font-sans font-medium text-red-400">
              ساعة
            </span>
          </div>

          <span className="text-2xl sm:text-3xl text-red-500/50 -mt-5">:</span>

          <div className="flex flex-col items-center">
            <span className="text-3xl sm:text-4xl md:text-5xl leading-none">
              {minutes.toString().padStart(2, "0")}
            </span>
            <span className="mt-2 text-xs sm:text-sm font-sans font-medium text-red-400">
              دقيقة
            </span>
          </div>

          <span className="text-2xl sm:text-3xl text-red-500/50 -mt-5">:</span>

          <div className="flex flex-col items-center">
            <span className="text-3xl sm:text-4xl md:text-5xl leading-none">
              {seconds.toString().padStart(2, "0")}
            </span>
            <span className="mt-2 text-xs sm:text-sm font-sans font-medium text-red-400">
              ثانية
            </span>
          </div>
        </div>

        {/* Note */}
        <p className="mt-6 text-xs sm:text-sm text-red-400/80 font-medium">
          (يُطبق الخصم تلقائياً عند إتمام الطلب)
        </p>

      </div>
    </section>
  );
};

export default CounterDown;