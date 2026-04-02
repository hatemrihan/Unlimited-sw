'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

const Typewriter = ({
  text,
  delay = 0,
  speed = 50,
  className = '',
  showCursor = false
}: {
  text: string,
  delay?: number,
  speed?: number,
  className?: string,
  showCursor?: boolean
}) => {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const timeout = setTimeout(() => {
      setIsTyping(true)
      let i = 0
      interval = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1))
        i++
        if (i >= text.length) {
          clearInterval(interval)
          setIsTyping(false)
        }
      }, speed)
    }, delay)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [text, delay, speed])

  return (
    <div className={`inline-block ${className}`}>
      {displayedText}
      {(isTyping || (!displayedText && showCursor)) && <span className="animate-pulse ml-1 opacity-70">|</span>}
    </div>
  )
}

function ThankYouContent() {
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const urlParams = new URLSearchParams(window.location.search)
    const orderIdParam = urlParams.get('orderId')

    if (orderIdParam) {
      setOrderId(orderIdParam)
      try {
        const orderData = sessionStorage.getItem('lastOrder')
        if (orderData) {
          setOrderDetails(JSON.parse(orderData))
        }
      } catch (error) {
        // Handle error quietly
      }
    } else {
      window.location.href = '/'
      return
    }

    setIsLoading(false)

    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('lastOrder')
      }
    }
  }, [])

  if (isLoading || !isMounted) {
    return <div className="min-h-screen bg-[#0E0E0E]" />
  }

  return (
    <main className="min-h-screen bg-stone-900 flex flex-col items-center justify-center text-white px-4 relative overflow-hidden font-sans">

      {/* Top Section: Order Info exactly replicating the top 3 lines of the art */}
      <div className="absolute top-[18%] md:top-[20%] flex flex-col items-center gap-1 text-[#888] text-[10px] md:text-xs tracking-[0.2em] font-light uppercase">
        <div className="h-4 flex items-center justify-center">
          <Typewriter text="ORDER CONFIRMED" delay={500} speed={40} />
        </div>
        <div className="h-4 flex items-center justify-center">
          <Typewriter text={`ID: #${orderId}`} delay={1500} speed={40} />
        </div>
        <div className="h-4 flex items-center justify-center">
          <Typewriter text={orderDetails ? `AMOUNT: ${orderDetails.totalAmount?.toLocaleString()} L.E` : 'PROCESSING AMOUNT...'} delay={2500} speed={40} />
        </div>
      </div>

      {/* Center Huge Text */}
      <div className="text-center w-full px-4 transform -translate-y-4">
        <Typewriter
          text="THANK YOU"
          delay={3500}
          speed={200} // Extra slow typing for the heavy impact
          className="text-[12vw] md:text-[8vw] xl:text-[9rem] font-medium tracking-[0.05em] text-[#EFEFEF] leading-none"
        />
      </div>

      {/* Bottom Link Section strictly matching the bottom 2 lines of the art */}
      <div className="absolute bottom-[20%] flex flex-col items-center gap-2 text-[#888] text-[10px] md:text-xs tracking-[0.2em] font-light uppercase">
        <div className="h-4 flex items-center justify-center">
          <Typewriter text="BY - UNLIMITED SW" delay={5800} speed={40} />
        </div>

        <div className="h-4 text-lg flex items-center justify-center mt-1 text-[#b3b3b3] tracking-widest font-normal" style={{ direction: 'rtl' }}>
          <Typewriter text="انت دلوقتي واحد مننا." delay={6800} speed={50} />
        </div>

        <Link href="/shop" className="h-4 flex  items-center justify-center hover:text-white transition-colors duration-500 cursor-pointer relative group mt-3">
          <Typewriter text="VISIT OUR PRODUCTS" delay={8000} speed={50} showCursor={true} />
          <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all duration-500 group-hover:w-full opacity-0 group-hover:opacity-100"></span>
        </Link>
      </div>
    </main>
  )
}

export default function ThankYouPage() {
  return <ThankYouContent />
} 