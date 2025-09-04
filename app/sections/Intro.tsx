"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useInView } from 'framer-motion';
import { IntroItem } from '../../models/intro';

// Dynamic Intro Component - Admin Controlled
const Intro = () => {
  // State for managing intro items from database
  const [introItems, setIntroItems] = useState<IntroItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [overlayActive, setOverlayActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Refs for animations and interactions
  const imageItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const overlayItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // Fetch intro items from admin-controlled database
  useEffect(() => {
    const fetchIntroItems = async () => {
      try {
        // Fast fetch without excessive logging
        const response = await fetch('/api/intro');
        
        if (response.ok) {
          const data = await response.json();
          setIntroItems(data.items || []);
        }
      } catch (error) {
        console.error('Error fetching intro items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntroItems();
    
    // Listen for updates from admin
    if (typeof window !== 'undefined') {
      const handleIntroUpdate = () => fetchIntroItems();
      window.addEventListener('intro-updated', handleIntroUpdate);
      
      return () => {
        window.removeEventListener('intro-updated', handleIntroUpdate);
      };
    }
  }, []);

  // Handle hover effect for changing active item
  const handleHover = (index: number) => {
    if (!overlayActive && index < introItems.length) {
      setActiveIndex(index);
      imageItemsRef.current.forEach((item, i) => {
        if (item) {
          item.style.opacity = i === index ? '1' : '0';
        }
      });
    }
  };

  // Handle project click to open URL
  const handleProjectClick = (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  // Open overlay for detailed view
  const openOverlay = (index: number) => {
    if (index >= introItems.length) return;
    
    setActiveIndex(index);
    setOverlayActive(true);
    const overlayItem = overlayItemsRef.current[index];
    if (overlayItem) {
      overlayItem.style.display = 'block';
      // Trigger smooth animation
      setTimeout(() => {
        overlayItem.style.opacity = '1';
        overlayItem.style.transform = 'translateY(0)';
      }, 10);
    }
  };

  // Close overlay
  const closeOverlay = () => {
    setOverlayActive(false);
    overlayItemsRef.current.forEach(item => {
      if (item) {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        setTimeout(() => {
          item.style.display = 'none';
        }, 300);
      }
    });
  };

  // Keyboard navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOverlay();
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // Enhanced video playback handling
    const handleVideoPlayback = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        // Immediate play attempt
        if (video.paused) {
          video.play().catch(() => {
            console.log('Video autoplay requires user interaction');
          });
        }
        
        // Force play on any interaction
        const playOnInteraction = () => {
          if (video.paused) {
            video.play().catch(() => {});
          }
        };
        
        ['click', 'touchstart', 'scroll', 'mousemove'].forEach(event => {
          document.addEventListener(event, playOnInteraction, { once: true });
        });
      });
    };
    
    // Run immediately and after delays
    handleVideoPlayback();
    setTimeout(handleVideoPlayback, 100);
    setTimeout(handleVideoPlayback, 500);
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render media (video or image) based on admin settings
  const renderMedia = (item: IntroItem, className: string, isMobile: boolean = false) => {
    console.log('🎬 Rendering media:', item.isVideo ? 'VIDEO' : 'IMAGE', item.mainImage);

    if (item.isVideo) {
      return (
        <video
          src={item.mainImage}
          className={className}
          autoPlay={true}
          muted={true}
          loop={true}
          playsInline={true}
          controls={false}
          preload="auto"
          onError={(e) => {
            console.error('❌ Video load error:', e);
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => console.log('✅ Video loaded successfully')}
          onLoadStart={() => console.log('🎬 Video loading started')}
        />
      );
    } else {
      return (
        <div className="relative w-full h-full">
          <img
            src={item.mainImage}
            alt={item.title}
            className={isMobile ? className.replace('object-cover', 'object-contain') : className}
            onError={(e) => {
              console.error('❌ Image load error:', e);
              console.error('❌ Failed image URL:', item.mainImage);
              e.currentTarget.style.display = 'none';
              // Show fallback
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
            onLoad={() => console.log('✅ Image loaded successfully:', item.mainImage)}
            onLoadStart={() => console.log('🖼️ Image loading started:', item.mainImage)}
          />
          {/* Fallback content */}
          <div className="absolute inset-0 hidden items-center justify-center bg-gray-800 rounded-lg">
            <div className="text-center text-gray-400">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs">Image unavailable</p>
            </div>
          </div>
        </div>
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <section className="relative min-h-screen bg-black text-[#b3b3b3] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </section>
    );
  }

  // No items state
  if (!loading && introItems.length === 0) {
    return (
      <section className="relative min-h-screen bg-black text-[#b3b3b3] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium text-gray-300 mb-4">No intro items available</h2>
          <p className="text-gray-400">Admin can add intro items from the dashboard.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
          >
            Refresh
          </button>
        </div>
      </section>
    );
  }

  console.log('🎨 Rendering intro with items:', introItems);
  
  return (
    <section className="relative min-h-screen bg-black text-[#b3b3b3] p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28 lg:pt-32 transition-colors duration-300" id="intro">
      
      {/* Section Title - Always Visible */}
      <div className="text-lg sm:text-xl font-bold tracking-[0.2em] uppercase mb-12 lg:mb-16 text-center text-[#b3b3b3]">
        — OUR ATHLETES
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 h-full max-w-5xl mx-auto">
        {/* Mobile & Tablet: Titles first */}
        <div className="flex items-center lg:hidden order-first">
          <ul className="w-full flex flex-col justify-center items-start space-y-3 sm:space-y-4 list-none">
            {introItems.map((item, index) => {
              console.log('🎯 Rendering mobile item:', index, item.title);
              return (
                <li 
                  key={`title-mobile-${index}`}
                  className={`transition-opacity duration-200 relative group ${activeIndex === index ? 'font-bold' : ''}`}
                  onMouseEnter={() => handleHover(index)}
                >
                  <button 
                    className="bg-transparent border-0 p-0 text-[#b3b3b3] font-['PP_Neue_Montreal',Arial,sans-serif] cursor-pointer w-full text-left"
                    onClick={() => openOverlay(index)}
                  >
                    <h2 className="main-title text-base sm:text-lg md:text-xl lg:text-2xl font-medium tracking-tight relative
                      after:absolute after:content-[''] after:top-1/2 after:right-[-0.75rem] sm:after:right-[-1rem] md:after:right-[-1.5rem] after:w-3 sm:after:w-4 md:after:w-6 after:h-0.5 
                      after:rounded-full after:bg-current after:opacity-0 after:transition-all after:duration-500 
                      after:transform after:translate-x-full after:scale-0 
                      group-hover:after:translate-x-0 group-hover:after:scale-100 group-hover:after:opacity-100 group-hover:after:w-2">
                      {index === activeIndex ? "→ " : ""}{item.title}
                    </h2>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        
        {/* Images - Smaller and responsive */}
        <div className="relative h-[280px] xs:h-[280px] sm:h-[290px] md:h-[320px] lg:h-[300px] order-2 lg:order-1">
          <div className="relative w-full h-full">
            {introItems.map((item, index) => {
              console.log('🖼️ Rendering image for item:', item.title, 'URL:', item.mainImage);
              return (
                <div 
                  key={index}
                  className="absolute w-full h-full transition-opacity duration-300" 
                  ref={(el) => { imageItemsRef.current[index] = el; }}
                  style={{ opacity: index === 0 ? 1 : 0 }}
                >
                  <div className="relative w-full h-full">
                    {renderMedia(item, "w-full h-full object-cover rounded-lg shadow-lg", true)}
                    {/* Additional fallback for main images */}
                    <div className="absolute inset-0 hidden items-center justify-center bg-gray-800 rounded-lg shadow-lg">
                      <div className="text-center text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm font-medium">Media unavailable</p>
                        <p className="text-xs mt-1">{item.title}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Desktop: Titles on right */}
        <div className="hidden lg:flex items-center order-3">
          <ul className="w-full flex flex-col justify-center items-end space-y-3 xl:space-y-4 list-none pr-4 xl:pr-6">
            {introItems.map((item, index) => (
              <li 
                key={`title-${index}`}
                className={`transition-opacity duration-200 relative group cursor-pointer ${activeIndex === index ? 'text-white dark:text-white' : 'text-white/80 dark:text-white/80'}`} 
                onMouseEnter={() => handleHover(index)}
              >
                <button 
                  className="bg-transparent border-0 p-0 font-['PP_Neue_Montreal',Arial,sans-serif] cursor-pointer text-right"
                  onClick={() => openOverlay(index)}
                >
                  <h2 className="main-title text-xl xl:text-2xl 2xl:text-3xl font-medium tracking-tight relative
                    after:absolute after:content-[''] after:top-1/2 after:left-[-1.5rem] after:w-6 after:h-0.5 
                    after:rounded-full after:bg-current after:opacity-0 after:transition-all after:duration-500 
                    after:transform after:translate-x-[-100%] after:scale-0 
                    group-hover:after:translate-x-0 group-hover:after:scale-100 group-hover:after:opacity-100 group-hover:after:w-2">
                    {item.title} {index === activeIndex ? " ←" : ""}
                  </h2>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Overlay - Mobile responsive with admin-controlled content */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        {introItems.map((item, index) => (
          <div 
            key={`overlay-${index}`}
            className="overlay-item hidden pb-16 pointer-events-auto bg-[#111111] text-[#b3b3b3] h-full overflow-y-auto transition-all duration-300 ease-out"
            ref={(el) => { 
              overlayItemsRef.current[index] = el;
              if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
              }
            }}
          >
            <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-16 sm:pb-20 lg:pb-24">
              <div className="flex flex-col items-center mb-8 lg:mb-12">
                <div className="text-center mb-6 lg:mb-8">
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium text-[#b3b3b3] hover:opacity-70 transition-opacity duration-200 underline decoration-2 underline-offset-4 sm:underline-offset-6 cursor-pointer block"
                  >
                    {item.title}
                  </a>
                </div>
                <div className="w-full max-w-3xl h-[40vh] sm:h-[45vh] lg:h-[50vh]">
                  <div className="relative w-full h-full">
                    {renderMedia(item, "w-full h-full object-cover rounded-lg", true)}
                    {/* Additional fallback for overlay main image */}
                    <div className="absolute inset-0 hidden items-center justify-center bg-gray-800 rounded-lg">
                      <div className="text-center text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg font-medium">Media unavailable</p>
                        <p className="text-sm mt-2">{item.title}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="overlay-row grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 mb-8 lg:mb-12">
                <div className="flex flex-col gap-4 lg:gap-6">
                  <div className="h-[200px] sm:h-[230px] lg:h-[260px]">
                    <div className="relative w-full h-full">
                      <img
                        src={item.leftImage}
                        alt={`${item.title} left image`}
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          console.error('❌ Left image failed to load:', item.leftImage);
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        onLoad={() => console.log('✅ Left image loaded successfully')}
                      />
                      {/* Fallback for left image */}
                      <div className="absolute inset-0 hidden items-center justify-center bg-gray-800 rounded-lg">
                        <div className="text-center text-gray-400">
                          <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs">Image unavailable</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 lg:gap-6">
                  <div className="h-[200px] sm:h-[230px] lg:h-[260px]">
                    <div className="relative w-full h-full">
                      <img
                        src={item.rightImage}
                        alt={`${item.title} right image`}
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          console.error('❌ Right image failed to load:', item.rightImage);
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        onLoad={() => console.log('✅ Right image loaded successfully')}
                      />
                      {/* Fallback for right image */}
                      <div className="absolute inset-0 hidden items-center justify-center bg-gray-800 rounded-lg">
                        <div className="text-center text-gray-400">
                          <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs">Image unavailable</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-[#b3b3b3]/90">{item.description}</p>
                </div>
              </div>
              
              {/* Navigation buttons - Mobile responsive */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 lg:pt-8 border-t border-gray-700/30">
                <button 
                  className="bg-transparent border-0 p-0 text-[#b3b3b3] hover:opacity-70 transition-opacity duration-200 cursor-pointer order-2 sm:order-1"
                  onClick={closeOverlay}
                >
                  <p className="text-base lg:text-lg">Back to list</p>
                </button>
                <p className="text-sm lg:text-lg text-[#b3b3b3]/70 order-1 sm:order-2">Scroll to explore</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Intro;
