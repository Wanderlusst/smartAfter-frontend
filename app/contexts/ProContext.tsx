'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ProContextType {
  isPro: boolean;
  upgradeToPro: () => void;
  downgradeToPro: () => void;
  toggleProForDev: () => void; // Add dev toggle
}

const ProContext = createContext<ProContextType | undefined>(undefined);

export const ProProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    // Check if user has Pro subscription on mount
    const proStatus = localStorage.getItem('smartafter_pro');
    setIsPro(proStatus === 'true');
  }, []);

  const upgradeToPro = () => {
    localStorage.setItem('smartafter_pro', 'true');
    setIsPro(true);
  };

  const downgradeToPro = () => {
    localStorage.removeItem('smartafter_pro');
    setIsPro(false);
  };

  const toggleProForDev = () => {
    const newStatus = !isPro;
    if (newStatus) {
      localStorage.setItem('smartafter_pro', 'true');
    } else {
      localStorage.removeItem('smartafter_pro');
    }
    setIsPro(newStatus);
  };

  return (
    <ProContext.Provider value={{ isPro, upgradeToPro, downgradeToPro, toggleProForDev }}>
      {children}
    </ProContext.Provider>
  );
};

export const usePro = () => {
  const context = useContext(ProContext);
  if (context === undefined) {
    throw new Error('usePro must be used within a ProProvider');
  }
  return context;
};
