'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, ShoppingCart, RotateCcw, Shield, FileText, Settings, CreditCard } from 'lucide-react';
import { optimizeRouteTransition, trackRouteChange } from '@/app/lib/performance';

import { useNonBlockingNavigation } from '../hooks/useNonBlockingNavigation';
// Background fetching completely removed

interface NavigationProps {
  className?: string;
  showBackgroundStatus?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ className = '', showBackgroundStatus = true }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { navigate } = useNonBlockingNavigation();
  // Background fetching completely removed

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/credit-card', label: 'Credit Card', icon: CreditCard },
    { href: '/multi-card', label: 'Multi-Card', icon: CreditCard },
    { href: '/purchases', label: 'Purchases', icon: ShoppingCart },
    { href: '/refunds', label: 'Refunds', icon: RotateCcw },
    { href: '/warranties', label: 'Warranties', icon: Shield },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  // Enhanced route switching with background fetching
  const handleRouteClick = useCallback(async (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    const startTime = performance.now();

    // Prefetch related routes for faster navigation
    optimizeRouteTransition(href);
    
    // Background fetching completely removed
    
    // SWR cache completely removed
    
    // Non-blocking navigation
    navigate(href);
    
    // Track performance
    setTimeout(() => {
      const duration = performance.now() - startTime;
      trackRouteChange(pathname, href, duration);
    }, 0);
  }, [navigate, pathname, showBackgroundStatus]);

  // Background fetching completely removed

  return (
    <nav className={`space-y-2 ${className}`}>

      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        const isPendingRoute = false; // isPending removed from hook

        return (
          <motion.div
            key={item.href}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
          >
            <Link
              href={item.href}
              onClick={(e) => handleRouteClick(item.href, e)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              } ${isPendingRoute ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>

              </div>
              
              <div className="flex items-center space-x-2">
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="w-2 h-2 bg-blue-500 rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Background fetching completely removed */}
              </div>
            </Link>
          </motion.div>
        );
      })}

    </nav>
  );
};

export default Navigation;
