"use client";

import React from 'react';

interface NavProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const Nav: React.FC<NavProps> = ({ activeSection, setActiveSection }) => {
  // Check if we're on the dashboard page
  const isDashboardPage = activeSection === 'dashboard';
  
  const navItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      )
    },
    { 
      id: 'intro', 
      label: 'OUR ATHLETES', 
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      id: 'products', 
      label: 'Products', 
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15V9h4v6H8z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      id: 'reviews', 
      label: 'Reviews', 
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      id: 'orders', 
      label: 'Orders', 
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    }
  ];

  return (
    <nav className="mb-8">
      <div className="flex flex-wrap gap-2 sm:gap-4">
        {navItems.map((item) => {
          // Skip rendering 'Dashboard' item if not on dashboard page
          if (item.label === 'Dashboard' && !isDashboardPage) {
            return null;
          }
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeSection === item.id
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                  : 'bg-white dark:bg-black text-black dark:text-white border border-black/10 dark:border-white/10 hover:shadow-md'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm sm:text-base">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Nav;


