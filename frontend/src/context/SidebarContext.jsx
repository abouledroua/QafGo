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

  // Desktop compact / icon-only mode toggle (e.g. w-20 vs w-64)
  const [isCollapsed, setIsCollapsed] = useState(false);

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
