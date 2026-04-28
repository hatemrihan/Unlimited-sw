"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Package, ShoppingCart, Mail, Star, Users,
  Tag, Settings, ChevronDown, ChevronRight, Store, LogOut,
  Bell, MapPin, CreditCard,
} from "lucide-react";

// ─── Navigation Config (Arabic) ──────────────────────────────

type NavChild = { title: string; section: string };
type NavItem = {
  title: string;
  section: string;
  icon: React.ElementType;
  children?: NavChild[];
};

const NAV_ITEMS: NavItem[] = [
  { title: "لوحة التحكم", section: "dashboard", icon: LayoutDashboard },
  { title: "الإشعارات", section: "notifications", icon: Bell },
  { title: "الطلبات", section: "orders", icon: ShoppingCart },
  { title: "المنتجات", section: "products", icon: Package },
  { title: "أكواد الخصم", section: "promo", icon: Tag },
  { title: "التقييمات", section: "reviews", icon: Star },
  { title: "رسائل التواصل", section: "contacts", icon: Mail },
];

const SETTINGS_ITEMS: NavChild[] = [
  { title: "الدفع", section: "payment-settings" },
  { title: "المحافظات", section: "governorates" },
];

// ─── Types for backward compat ───────────────────────────────

interface LegacyNavItem {
  label: string;
  href: string;
  icon: string | React.ReactElement;
  ariaLabel?: string;
  onClick?: () => void;
}

interface SidebarNavProps {
  logo?: string;
  logoAlt?: string;
  items?: LegacyNavItem[];
  activeHref?: string;
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
  // New clean API
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

// ─── Sidebar Component ───────────────────────────────────────

const SidebarNav = ({
  logo = "/images/Logo-image.png",
  logoAlt = "Logo",
  activeSection = "dashboard",
  onSectionChange,
  // Legacy props (ignored in new design but accepted for compat)
  items,
  activeHref,
  userName = "Admin",
  onVisitStore,
}: SidebarNavProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Derive active from legacy prop if new prop not provided
  const currentSection = activeSection || activeHref?.replace('#', '') || 'dashboard';

  // Auto-open settings if a settings child is active
  useEffect(() => {
    if (SETTINGS_ITEMS.some(c => c.section === currentSection)) {
      setSettingsOpen(true);
    }
  }, [currentSection]);

  const handleNav = (section: string) => {
    if (onSectionChange) {
      onSectionChange(section);
    } else if (items) {
      // Legacy: find matching item and call onClick
      const match = items.find(i => i.href === `#${section}`);
      match?.onClick?.();
    }
    setMobileOpen(false);
  };

  const handleExternal = (path: string) => {
    if (typeof window !== 'undefined') window.open(path, '_blank');
    setMobileOpen(false);
  };

  const isActive = (section: string) => currentSection === section;

  const navContent = (
    <aside
      className="flex flex-col h-full rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'rgba(28, 25, 23, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      dir="rtl"
    >
      {/* Header */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => handleNav('dashboard')}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors group w-full"
        >
          <div className="w-6 h-6 flex items-center justify-center overflow-hidden shrink-0">
            <Image src={logo} alt={logoAlt} width={18} height={18} className="object-contain" />
          </div>
          <span className="text-[12px] font-semibold text-stone-200 leading-none tracking-wide">
            UNLIMITED
          </span>
          <span className="text-[10px] text-stone-600 leading-none mr-auto">
            لوحة التحكم
          </span>
        </button>
      </div>

      <div className="h-px bg-white/[0.06] mx-3" />

      {/* Scrollable Nav */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        <nav className="px-2 py-2">
          <div className="space-y-px">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.section);
              return (
                <button
                  key={item.section}
                  onClick={() => handleNav(item.section)}
                  className={`
                    w-full flex items-center gap-2 px-2.5 py-[6px] rounded-md text-[12px]
                    transition-all duration-75
                    ${active
                      ? "bg-white/[0.08] text-white font-medium"
                      : "text-white/80 hover:text-white hover:bg-white/[0.04]"
                    }
                  `}
                >
                  <item.icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-white' : 'text-white/60'}`} strokeWidth={active ? 2 : 1.5} />
                  <span className="flex-1 text-right truncate">{item.title}</span>
                  {active && <ChevronRight className="h-2.5 w-2.5 text-white/60 rotate-180" />}
                </button>
              );
            })}
          </div>

          {/* Settings (collapsible) */}
          <div className="mt-px">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`
                w-full flex items-center gap-2 px-2.5 py-[6px] rounded-md text-[12px]
                transition-all duration-75 cursor-pointer
                ${settingsOpen ? "text-white" : "text-white/80 hover:text-white hover:bg-white/[0.04]"}
              `}
            >
              <Settings className={`h-3.5 w-3.5 shrink-0 ${settingsOpen ? 'text-white' : 'text-white/60'}`} strokeWidth={1.5} />
              <span className="flex-1 text-right truncate">الإعدادات</span>
              <ChevronDown className={`h-2.5 w-2.5 text-white/60 transition-transform duration-150 ${settingsOpen ? 'rotate-0' : '-rotate-90'}`} />
            </button>

            {settingsOpen && (
              <div className="mr-[18px] pr-2.5 border-r border-white/[0.06] mt-px space-y-px">
                <button
                  onClick={() => handleNav('payment')}
                  className={`w-full block px-2.5 py-[5px] rounded-md text-[11px] text-right transition-all duration-75 ${isActive('payment') ? 'text-white bg-white/[0.04]' : 'text-white/70 hover:text-white hover:bg-white/[0.04]'}`}
                >
                  💳 الدفع
                </button>
                <button
                  onClick={() => handleNav('governorates')}
                  className={`w-full block px-2.5 py-[5px] rounded-md text-[11px] text-right transition-all duration-75 ${isActive('governorates') ? 'text-white bg-white/[0.04]' : 'text-white/70 hover:text-white hover:bg-white/[0.04]'}`}
                >
                  📍 المحافظات
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="mt-auto mb-4">
          <div className="h-px bg-white/[0.06] mx-3" />
          <div className="px-2 py-2 space-y-px">
            {/* User */}
            <div className="flex items-center gap-2 px-2.5 py-[6px]">
              <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
                <span className="text-[9px] text-white/50 font-medium">{userName?.charAt(0)?.toUpperCase() || 'A'}</span>
              </div>
              <span className="text-[11px] text-white/40 truncate flex-1 text-right">{userName}</span>
            </div>
            {/* Visit Store */}
            <button
              onClick={onVisitStore || (() => { if (typeof window !== 'undefined') window.open('/', '_blank'); })}
              className="w-full flex items-center gap-2 px-2.5 py-[6px] rounded-md text-white/80 hover:text-white hover:bg-white/[0.04] transition-all duration-75 group"
            >
              <Store className="h-3.5 w-3.5 shrink-0 group-hover:text-white" strokeWidth={1.5} />
              <span className="text-[11px] font-medium leading-none truncate flex-1 text-right">العودة للمتجر</span>
              <LogOut className="h-3 w-3 text-white/50 group-hover:text-white/80 shrink-0" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar - Right side for RTL */}
      <div className="hidden md:block fixed top-0 right-0 z-40 w-[220px] pt-4 pr-4 h-screen">
        <div className="h-[calc(100%-2rem)] overflow-hidden rounded-lg">
          {navContent}
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 backdrop-blur-lg border-t border-white/[0.06]">
        <div className="flex items-center justify-around px-2 py-1.5">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const active = isActive(item.section);
            return (
              <button
                key={item.section}
                onClick={() => handleNav(item.section)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors ${active ? 'text-white' : 'text-white/40'}`}
              >
                <item.icon className="h-4 w-4" strokeWidth={active ? 2 : 1.5} />
                <span className="text-[8px]">{item.title}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-white/40"
          >
            <Settings className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-[8px]">المزيد</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-0 right-0 w-[260px] h-full bg-stone-900 border-l border-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};

export default SidebarNav;
