"use client";

import { FC, useEffect, useState, MouseEvent } from "react";
import { useAnimate } from "motion/react";
import { useCart } from "../../contexts/CartContext";
import Image from "next/image";
import Link from "next/link";



const navItems = [
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Shop",
    href: "/shop",
  },
  // {
  //   label: "Our Athletes",
  //   href: "#intro",
  // },

  {
    label: "Reviews",
    href: "#feedbackform",
  },
  {
    label: "Get in touch",
    href: "#contact",
  },

];

const Nav: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [navScope, navAnimate] = useAnimate();
  const [mounted, setMounted] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const { state: cartState } = useCart();

  // Initialize theme toggle
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle dynamic styling after mount to prevent hydration mismatch
  useEffect(() => {
    if (!mounted) return;

    // Handle nav items
    const navItems = document.querySelectorAll('[data-nav-item="true"]');
    navItems.forEach((item, index) => {
      if (isOpen) {
        item.classList.remove('opacity-0', '-translate-x-8');
        item.classList.add('opacity-100', 'translate-x-0');
        (item as HTMLElement).style.transitionDelay = `${index * 100}ms`;
      } else {
        item.classList.remove('opacity-100', 'translate-x-0');
        item.classList.add('opacity-0', '-translate-x-8');
        (item as HTMLElement).style.transitionDelay = '0ms';
      }
    });

    // Handle header background
    const header = document.querySelector('[data-header="true"]');
    if (header) {
      if (isOpen) {
        header.classList.remove('bg-transparent', 'border-gray-800/50');
        header.classList.add('bg-white', 'border-gray-300/50');
      } else {
        header.classList.remove('bg-white', 'border-gray-300/50');
        header.classList.add('bg-transparent', 'border-gray-800/50');
      }
    }

    // Handle dynamic text colors - Turn black when nav opens
    const dynamicElements = document.querySelectorAll('[data-dynamic-color="true"]');
    dynamicElements.forEach((element) => {
      if (isOpen) {
        element.classList.remove('text-[#b3b3b3]');
        element.classList.add('text-black');
      } else {
        element.classList.remove('text-black');
        element.classList.add('text-[#b3b3b3]');
      }
    });

    // Handle logo filter - Turn black when nav opens
    const logo = document.querySelector('[data-logo="true"]');
    if (logo) {
      if (isOpen) {
        logo.classList.remove('filter', 'brightness-0', 'invert');
        logo.classList.add('filter-none');
      } else {
        logo.classList.remove('filter-none');
        logo.classList.add('filter', 'brightness-0', 'invert');
      }
    }
  }, [isOpen, mounted]);

  // Force video playback on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      // Force play on iOS
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {
          // Fallback if autoplay fails
          console.log('Video autoplay failed, user interaction required');
        });
      });

      // Handle touch events for iOS
      const playVideo = () => {
        video.play().catch(() => { });
        document.removeEventListener('touchstart', playVideo);
      };

      document.addEventListener('touchstart', playVideo, { once: true });
    });
  }, []);

  // Initialize navigation to closed state on mount and after page refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Ensure nav starts closed
    setIsOpen(false);

    // Prevent horizontal scrolling completely
    if (typeof document !== 'undefined') {
      document.body.style.overflowX = 'hidden';
      document.documentElement.style.overflowX = 'hidden';
    }

    // Initialize nav height to 0
    if (navScope.current) {
      navScope.current.style.height = '0px';
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflowX = 'auto';
        document.documentElement.style.overflowX = 'auto';
      }
    };
  }, [navScope]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen) {
      navAnimate(navScope.current, {
        height: "100vh"
      },
        {
          duration: 0.7,
        });
      // Prevent body scroll when nav is open
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
    } else {
      navAnimate(navScope.current, {
        height: 0
      });
      // Restore body scroll when nav is closed
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'auto';
      }
    }
  }, [isOpen, navScope, navAnimate]);

  const handleClickMobileNavItem = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsOpen(false);
    const url = new URL(e.currentTarget.href);

    if (typeof window === 'undefined') return;

    // Always navigate to /about if that's the link
    if (url.pathname === '/about') {
      window.location.href = '/about';
      return;
    }

    // Handle external routes
    if (url.pathname !== window.location.pathname) {
      window.location.href = url.href;
      return;
    }

    // Handle internal hash navigation with better smooth scrolling
    const hash = url.hash;
    if (hash) {
      // Add a small delay to allow menu to close first
      setTimeout(() => {
        const target = document.querySelector(hash);
        if (target) {
          // Calculate offset for fixed header
          const headerHeight = 80; // Approximate header height
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }, 300); // Wait for menu animation to complete
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };



  const handleLoaderComplete = () => {
    setShowLoader(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/about';
    }
  };



  return (
    <div className="overflow-x-hidden w-full">


      {/* Navigation Header */}
      <header className="relative w-full">
        {/* Mobile Sliding Navigation */}
        <div className="fixed top-0 left-0 w-full h-0 overflow-hidden z-40 bg-white transition-colors duration-300 text-center" ref={navScope}>
          <nav className="mt-16 sm:mt-20 flex flex-col w-full text-center">
            {navItems.map(({ label, href }, index) => (
              <a
                href={href}
                key={label}
                className="text-black border-t last:border-b border-gray-700/30 py-6 sm:py-8 group/nav-items relative isolate bg-white w-full transition-all duration-300 hover:text-gray-500 hover:bg-gray-50 text-center opacity-0 -translate-x-8"
                data-nav-item="true"
                onClick={handleClickMobileNavItem}
              >
                <div className="container mx-auto px-4 sm:px-6 flex items-center justify-center">
                  <div className="absolute w-full h-0 bg-gray-100 group-hover/nav-items:h-full transition-all duration-500 bottom-0 -z-10"></div>
                  <span className="text-2xl sm:text-3xl group-hover/nav-items:pl-4 transition-all duration-500 font-medium">
                    {label}
                  </span>
                </div>
              </a>
            ))}



          </nav>
        </div>

        {/* Fixed Header - Always on top */}
        <div className="fixed top-0 left-0 right-0 w-full z-50 transition-colors duration-300 bg-transparent" data-header="true" suppressHydrationWarning>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 lg:h-20 relative">
              {/* Mobile: Menu Button - Left */}
              <div className="lg:hidden flex items-center">
                <button
                  className="hover:text-gray-400 transition-colors duration-300 relative z-10 px-3 py-2 min-w-[60px] min-h-[44px] flex flex-col items-center justify-center gap-1 cursor-pointer text-[#b3b3b3]"
                  data-dynamic-color="true"
                  onClick={toggleMenu}
                  aria-label="Toggle menu"
                  suppressHydrationWarning
                >
                  <span className="block w-6 h-0.5 bg-current transition-all duration-300 cursor-pointer"></span>
                  <span className="block w-6 h-0.5 bg-current transition-all duration-300 cursor-pointer"></span>
                </button>
              </div>

              {/* Logo - Center on Mobile, Left on Desktop */}
              <div className="absolute left-1/2 lg:left-60 transform -translate-x-1/2 lg:relative lg:transform-none flex-shrink-0 flex items-center pt-3 text-[#b3b3b3]" data-dynamic-color="true" suppressHydrationWarning>
                <Link href="/" className="block">
                  <div className="relative text-[#b3b3b3]" data-dynamic-color="true" suppressHydrationWarning>
                    <Image
                      src="/images/Logo-image.png"
                      alt="Logo"
                      width={500}
                      height={500}
                      className="h-25 lg:h-30 w-auto object-contain hover:scale-105 transition-all duration-300 filter brightness-0 invert opacity-70"
                      data-logo="true"
                      onError={(e) => {
                        // Fallback to text if image fails to load
                        const target = e.currentTarget;
                        const fallback = target.nextElementSibling as HTMLElement;
                        target.style.display = 'none';
                        if (fallback) {
                          fallback.style.display = 'block';
                        }
                      }}
                    />

                  </div>
                </Link>
              </div>

              {/* Desktop Navigation - Centered */}
              <div className="hidden lg:flex flex-1 justify-center">
                <nav className="flex items-center space-x-8 xl:space-x-12">
                  {navItems.map(({ label, href }) => (
                    <a
                      href={href}
                      key={label}
                      className="relative text-[#b3b3b3] hover:text-gray-400 transition-colors duration-300 text-base font-medium py-2 group"
                      onClick={(e) => {
                        e.preventDefault();
                        if (typeof window === 'undefined') return;

                        if (href === '/about') {
                          window.location.href = '/about';
                          return;
                        }
                        if (href.startsWith('/')) {
                          window.location.href = href;
                          return;
                        }

                        // Improved smooth scrolling for hash links
                        if (href.startsWith('#')) {
                          const target = document.querySelector(href);
                          if (target) {
                            const headerHeight = 80; // Approximate header height
                            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                            window.scrollTo({
                              top: targetPosition,
                              behavior: 'smooth'
                            });
                          }
                        }
                      }}
                    >
                      {label}
                      {/* Hover line effect */}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-300 transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  ))}
                </nav>
              </div>

              {/* Right Side Icons - Desktop and Mobile */}
              <div className="flex items-center space-x-3">
                {/* Desktop Cart and Account Icons */}
                <div className="hidden lg:flex items-center space-x-4">
                  {/* Desktop Cart Icon */}
                  <div className="relative group">
                    <button
                      onClick={() => window.location.href = '/cart'}
                      className="text-[#b3b3b3] hover:text-white transition-all duration-300 px-3 py-2 cursor-pointer relative flex items-center gap-2"
                      suppressHydrationWarning
                    >

                      <span className="text-sm font-medium">Cart</span>
                      {/* Cart Count Badge */}
                      {cartState.itemCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {cartState.itemCount}
                        </span>
                      )}
                    </button>
                    {/* Underline hover effect */}
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></div>
                  </div>

                  {/* Desktop Account Icon
                      A link, not a session.
                      Reading the session here made every anonymous shopper pay
                      for /api/auth/session on every page — to render an icon
                      that, for a customer, never changes: the storefront has no
                      accounts and checkout is a guest flow. The only people who
                      sign in are admins, and /admin/login is where they do it. */}
                  <Link
                    href="/admin"
                    className="text-[#b3b3b3] hover:text-gray-400 transition-colors duration-300 p-2 hover:bg-gray-700/30 rounded-lg cursor-pointer"
                    aria-label="Admin sign in"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="w-6 h-6 fill-current">
                      <path fillRule="evenodd" d="M10 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm-2 3.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" />
                      <path fillRule="evenodd" d="M15.484 14.227a6.274 6.274 0 0 0-10.968 0l-.437.786a1.338 1.338 0 0 0 1.17 1.987h9.502a1.338 1.338 0 0 0 1.17-1.987l-.437-.786Zm-9.657.728a4.773 4.773 0 0 1 8.346 0l.302.545h-8.95l.302-.545Z" />
                    </svg>
                  </Link>
                </div>

                {/* Mobile Cart and Account Icons */}
                <div className="lg:hidden flex items-center space-x-2">
                  {/* Mobile Cart Icon */}
                  <div className="relative group">
                    <button
                      onClick={() => window.location.href = '/cart'}
                      className="text-[#b3b3b3] hover:text-white transition-all duration-300 px-2 py-1 cursor-pointer relative flex items-center gap-1"
                      data-dynamic-color="true"
                      suppressHydrationWarning
                    >

                      <span className="text-xs font-medium">Cart</span>
                      {/* Cart Count Badge */}
                      {cartState.itemCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-white text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {cartState.itemCount}
                        </span>
                      )}
                    </button>
                    {/* Underline hover effect */}
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-current transition-all duration-300 group-hover:w-full"></div>
                  </div>

                  {/* Mobile Account Icon — see the desktop one above */}
                  <Link
                    href="/admin"
                    className="text-[#b3b3b3] hover:text-gray-400 transition-colors duration-300 p-2 hover:bg-gray-700/30 rounded-lg cursor-pointer"
                    data-dynamic-color="true"
                    aria-label="Admin sign in"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                      <path fillRule="evenodd" d="M10 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm-2 3.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" />
                      <path fillRule="evenodd" d="M15.484 14.227a6.274 6.274 0 0 0-10.968 0l-.437.786a1.338 1.338 0 0 0 1.17 1.987h9.502a1.338 1.338 0 0 0 1.17-1.987l-.437-.786Zm-9.657.728a4.773 4.773 0 0 1 8.346 0l.302.545h-8.95l.302-.545Z" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>


    </div>
  );
};

export default Nav;