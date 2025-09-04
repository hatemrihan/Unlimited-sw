import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useSession, signOut } from 'next-auth/react';

interface NavItem {
  label: string;
  href: string;
  icon: string | React.ReactElement;
  ariaLabel?: string;
  onClick?: () => void;
}

interface SidebarNavProps {
  logo?: string;
  logoAlt?: string;
  items: NavItem[];
  activeHref: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
  userName?: string;
  onVisitStore?: () => void;
}

const SidebarNav = ({
  logo,
  logoAlt = 'Logo',
  items,
  activeHref,
  ease = 'power3.easeOut',
  baseColor = '#fff',
  pillColor = '#060010',
  hoveredPillTextColor = '#000',
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = true,
  userName = 'Admin',
  onVisitStore
}: SidebarNavProps) => {
  const { data: session } = useSession();
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRefs = useRef<(gsap.core.Timeline | null)[]>([]);
  const activeTweenRefs = useRef<(gsap.core.Tween | null)[]>([]);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach(circle => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`
        });

        const label = pill.querySelector('.pill-label');
        const white = pill.querySelector('.pill-label-hover');

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0);

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0);
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0);
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    const onResize = () => layout();
    window.addEventListener('resize', onResize);

    if (document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    const menu = mobileMenuRef.current;
    if (menu) {
      gsap.set(menu, { visibility: 'hidden', opacity: 0, scaleY: 1, y: 0 });
    }

    if (initialLoadAnimation) {
      const logo = logoRef.current;
      const navItems = navItemsRef.current;

      if (logo) {
        gsap.set(logo, { scale: 0 });
        gsap.to(logo, {
          scale: 1,
          duration: 0.6,
          ease
        });
      }

      if (navItems) {
        gsap.set(navItems, { width: 0, overflow: 'hidden' });
        gsap.to(navItems, {
          width: 'auto',
          duration: 0.6,
          ease
        });
      }
    }

    return () => window.removeEventListener('resize', onResize);
  }, [items, ease, initialLoadAnimation]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: 'auto'
    });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: 'auto'
    });
  };


  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);

    const hamburger = hamburgerRef.current;
    const menu = mobileMenuRef.current;

    if (hamburger) {
      const lines = hamburger.querySelectorAll('.hamburger-line');
      if (newState) {
        gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease });
        gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease });
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease });
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease });
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: 'visible' });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10, scaleY: 1 },
          {
            opacity: 1,
            y: 0,
            scaleY: 1,
            duration: 0.3,
            ease,
            transformOrigin: 'top center'
          }
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          scaleY: 1,
          duration: 0.2,
          ease,
          transformOrigin: 'top center',
          onComplete: () => {
            gsap.set(menu, { visibility: 'hidden' });
          }
        });
      }
    }

    onMobileMenuClick?.();
  };

  const isExternalLink = (href: string) =>
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('#');

  const isRouterLink = (href: string) => href && !isExternalLink(href);

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/admin/login' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get user info from session
  const userEmail = session?.user?.email || 'admin@example.com';
  const userInitial = userEmail.charAt(0).toUpperCase();
  
  // Show loading state if session is being fetched
  if (!session) {
    return (
      <div className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-black shadow-lg z-50">
        <div className="flex flex-col w-full p-6 items-center justify-center">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white text-sm mt-4">Loading...</div>
        </div>
      </div>
    );
  }

  const cssVars = {
    ['--base']: baseColor,
    ['--pill-bg']: pillColor,
    ['--hover-text']: hoveredPillTextColor,
    ['--pill-text']: resolvedPillTextColor,
    ['--nav-h']: '42px',
    ['--logo']: '36px',
    ['--pill-pad-x']: '18px',
    ['--pill-gap']: '3px'
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-black shadow-lg z-50">
        <div className="flex flex-col w-full p-6">
          {/* Logo Section */}
          <div className="mb-8">
            <div className="text-white font-bold text-xl">
          UNLIMITED-SW
            </div>
          </div>

          {/* Visit Store Button */}
          <button 
            onClick={onVisitStore}
            className="w-full bg-white text-black py-3 px-4 rounded-lg font-semibold text-sm mb-6 flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            VISIT STORE
          </button>

          {/* Navigation Items */}
          <div ref={navItemsRef} className="flex-1">
            <ul className="space-y-2">
              {items.map((item, i) => {
                const isActive = activeHref === item.href;

                const PillContent = (
                  <>
                    <span
                      className="hover-circle absolute left-1/2 bottom-0 rounded-full z-[1] block pointer-events-none"
                      style={{
                        background: 'var(--base, #fff)',
                        willChange: 'transform'
                      }}
                      aria-hidden="true"
                      ref={el => {
                        circleRefs.current[i] = el;
                      }}
                    />
                    <span className="label-stack relative inline-block leading-[1] z-[2]">
                      <span
                        className="pill-label relative z-[2] inline-block leading-[1]"
                        style={{ willChange: 'transform' }}
                      >
                        {item.label}
                      </span>
                      <span
                        className="pill-label-hover absolute left-0 top-0 z-[3] inline-block"
                        style={{
                          color: 'var(--hover-text, #000)',
                          willChange: 'transform, opacity'
                        }}
                        aria-hidden="true"
                      >
                        {item.label}
                      </span>
                    </span>
                  </>
                );

                const basePillClasses = `relative overflow-hidden inline-flex items-center justify-center h-12 w-full no-underline rounded-lg box-border font-medium text-sm leading-[0] whitespace-nowrap cursor-pointer px-4 transition-all duration-200`;

                return (
                  <li key={item.href}>
                    {item.onClick ? (
                      <button
                        role="menuitem"
                        onClick={item.onClick}
                        className={`${basePillClasses} ${
                          isActive 
                            ? 'bg-white text-black' 
                            : 'bg-transparent text-gray-300 hover:bg-gray-800'
                        }`}
                        aria-label={item.ariaLabel || item.label}
                        onMouseEnter={() => handleEnter(i)}
                        onMouseLeave={() => handleLeave(i)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-lg">
                            {typeof item.icon === 'string' ? item.icon : item.icon}
                          </span>
                          {PillContent}
                        </div>
                      </button>
                    ) : isRouterLink(item.href) ? (
                      <Link
                        role="menuitem"
                        href={item.href}
                        className={`${basePillClasses} ${
                          isActive 
                            ? 'bg-white text-black' 
                            : 'bg-transparent text-gray-300 hover:bg-gray-800'
                        }`}
                        aria-label={item.ariaLabel || item.label}
                        onMouseEnter={() => handleEnter(i)}
                        onMouseLeave={() => handleLeave(i)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-lg">
                            {typeof item.icon === 'string' ? item.icon : item.icon}
                          </span>
                          {PillContent}
                        </div>
                      </Link>
                    ) : (
                      <a
                        role="menuitem"
                        href={item.href}
                        className={`${basePillClasses} ${
                          isActive 
                            ? 'bg-white text-black' 
                            : 'bg-transparent text-gray-300 hover:bg-gray-800'
                        }`}
                        aria-label={item.ariaLabel || item.label}
                        onMouseEnter={() => handleEnter(i)}
                        onMouseLeave={() => handleLeave(i)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-lg">
                            {typeof item.icon === 'string' ? item.icon : item.icon}
                          </span>
                          {PillContent}
                        </div>
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* User Section */}
          <div className="mt-auto pt-6 border-t border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">{userInitial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-300 uppercase">WELCOME</div>
                <div className="text-xs text-gray-400 truncate" title={userEmail}>
                  {userEmail}
                </div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 text-red-400 hover:text-red-300 text-sm font-medium transition-colors duration-200 w-full p-2 rounded-lg hover:bg-red-900/20"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          ref={hamburgerRef}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          className="rounded-full border-0 flex items-center justify-center cursor-pointer p-3 relative bg-black text-white font-semibold text-sm"
        >
          {isMobileMenuOpen ? 'CLOSE' : 'MENU'}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        ref={mobileMenuRef}
        className="md:hidden fixed top-16 left-4 right-4 bg-black rounded-lg shadow-lg z-40"
        style={{
          ...cssVars,
          background: 'var(--base, #000)'
        }}
      >
        <div className="p-4">
          {/* Visit Store Button */}
          <button 
            onClick={onVisitStore}
            className="w-full bg-white text-black py-3 px-4 rounded-lg font-semibold text-sm mb-4 flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            VISIT STORE
          </button>

          {/* Navigation Items */}
          <ul className="space-y-2">
            {items.map(item => {
              const isActive = activeHref === item.href;
              const defaultStyle = {
                background: isActive ? 'var(--pill-bg, #fff)' : 'transparent',
                color: isActive ? 'var(--base, #000)' : '#d1d5db'
              };
              const hoverIn = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--pill-bg, #fff)';
                  e.currentTarget.style.color = 'var(--base, #000)';
                }
              };
              const hoverOut = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#d1d5db';
                }
              };

              const linkClasses = 'flex items-center gap-3 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 w-full';

              return (
                <li key={item.href}>
                  {item.onClick ? (
                    <button
                      onClick={() => {
                        item.onClick?.();
                        setIsMobileMenuOpen(false);
                      }}
                      className={linkClasses}
                      style={defaultStyle}
                      onMouseEnter={hoverIn}
                      onMouseLeave={hoverOut}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </button>
                  ) : isRouterLink(item.href) ? (
                    <Link
                      href={item.href}
                      className={linkClasses}
                      style={defaultStyle}
                      onMouseEnter={hoverIn}
                      onMouseLeave={hoverOut}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      className={linkClasses}
                      style={defaultStyle}
                      onMouseEnter={hoverIn}
                      onMouseLeave={hoverOut}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>

          {/* User Section */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">{userInitial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-300 uppercase">WELCOME</div>
                <div className="text-xs text-gray-400 truncate" title={userEmail}>
                  {userEmail}
                </div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 text-red-400 hover:text-red-300 text-sm font-medium transition-colors duration-200 w-full p-2 rounded-lg hover:bg-red-900/20"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarNav;
