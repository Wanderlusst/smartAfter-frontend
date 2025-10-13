"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

const SidebarContext = createContext({
  collapsed: false,
  setCollapsed: (v: boolean) => {},
  autoCollapse: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        if (window.innerWidth < 768) setCollapsed(true);
        else setCollapsed(false);
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const autoCollapse = () => {
    if (typeof window !== 'undefined') {
      setCollapsed(window.innerWidth < 768);
    }
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, autoCollapse }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
} 