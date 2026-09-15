import React, { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  // Breakpoint: 1024px (Tailwind lg)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  // On large screens: default visible (true). On small screens: auto-hide (false).
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Desktop compact / icon-only mode toggle (e.g. w-20 vs dynamic width)
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Dynamic custom width for desktop expanded mode (persisted in localStorage)
  const [customWidth, setCustomWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_custom_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 200 && parsed <= 450) {
          return parsed;
        }
      }
    }
    return 260; // default 260px (around w-64)
  });

  const updateCustomWidth = (newWidth) => {
    const clamped = Math.min(450, Math.max(200, Math.round(newWidth)));
    setCustomWidth(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_custom_width', clamped.toString());
    }
  };

  const resetCustomWidth = () => {
    setCustomWidth(260);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sidebar_custom_width');
    }
  };

  // Monitor screen resize & auto-hide on small screens
  useEffect(() => {
    let timeoutId = null;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);

        if (mobile) {
          // Auto-hide when screen becomes small
          setIsOpen(false);
          setIsCollapsed(false);
        } else {
          // Auto-show on wide screens
          setIsOpen(true);
        }
      }, 50);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const toggleSidebar = () => {
    setIsOpen(prev => !prev);
  };

  const toggleCollapsed = () => {
    setIsCollapsed(prev => !prev);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const openSidebar = () => {
    setIsOpen(true);
  };

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isCollapsed,
        setIsCollapsed,
        customWidth,
        setCustomWidth: updateCustomWidth,
        resetCustomWidth,
        isMobile,
        toggleSidebar,
        toggleCollapsed,
        closeSidebar,
        openSidebar
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);
