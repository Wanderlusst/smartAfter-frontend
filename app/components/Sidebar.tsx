"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import * as Tooltip from '@radix-ui/react-tooltip';
import { useSidebar } from './SidebarContext';
// ReactBits components
import { FadeInText, AnimatedButton, LoadingSpinner } from './reactbits';
import OptimizedNavigation from './OptimizedNavigation';
import {
  LayoutDashboard, 
  Mail, 
  ShoppingBag, 
  RefreshCw, 
  Shield, 
  FileText, 
  Settings, 
  DollarSign, 
  ChevronDown,
  Menu,
  X,
  Home,
  TrendingUp,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Inbox", url: "/inbox", icon: Mail },
    ],
  },
  {
    label: "Purchases",
    collapsible: true,
    items: [
      { title: "Purchases", url: "/purchases", icon: ShoppingBag },
      { title: "Refunds", url: "/refunds", icon: RefreshCw },
      { title: "Warranties", url: "/warranties", icon: Shield },
      { title: "Receipts", url: "/documents", icon: FileText },
    ],
  },
  // COMMENTED OUT - Credit Card Analysis disabled
  // {
  //   label: "Analytics",
  //   collapsible: true,
  //   items: [
  //     { title: "Credit Card Analysis", url: "/credit-card", icon: CreditCard },
  //   ],
  // },
];

const BOTTOM_SECTION = {
  label: "Other",
  items: [
    { title: "Pricing", url: "/pricing", icon: DollarSign },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
};

export default function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Purchases': true, // Default open
    'Analytics': true // Default open
  });

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleSection = (sectionLabel: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionLabel]: !prev[sectionLabel]
    }));
  };

  const sidebarVariants = {
    expanded: { width: "16rem", minWidth: "16rem" },
    collapsed: { width: "4rem", minWidth: "4rem" }
  };

  const navItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0
    },
    hover: {
      x: 4
    }
  };

  const activeIndicatorVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1
    }
  };

  return (
    <motion.aside
      variants={sidebarVariants}
      animate={collapsed ? "collapsed" : "expanded"}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`h-full z-30 flex flex-col bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 shadow-sm ${
        collapsed ? 'overflow-hidden' : ''
      }`}
    >
      {/* Header with Toggle Button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3"
            >
              <motion.div 
                className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-white font-bold text-sm">S</span>
              </motion.div>
              <div>
                <FadeInText 
                  text="SmartAfter"
                  className="text-lg font-bold text-gray-900 dark:text-gray-100"
                  delay={0.2}
                  direction="fade"
                />
                <FadeInText 
                  text="AI-Powered Analytics"
                  className="text-xs text-gray-500 dark:text-gray-400"
                  delay={0.4}
                  direction="fade"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <AnimatedButton
                onClick={toggleSidebar}
                variant="ghost"
                size="sm"
                hoverEffect="scale"
                className="p-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 focus:ring-blue-500/20"
              >
                <motion.div
                  animate={{ rotate: collapsed ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </motion.div>
              </AnimatedButton>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg text-sm font-medium shadow-lg border border-gray-200 dark:border-gray-700"
                side="right"
              >
                {collapsed ? "Expand sidebar" : "Collapse sidebar"}
                <Tooltip.Arrow className="fill-gray-200 dark:fill-gray-700" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>

      {/* Navigation Content */}
      <div className={`flex-1 py-4 ${collapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <motion.div
          variants={navItemVariants}
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.1 }}
          className="space-y-6"
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="px-4">
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between mb-3"
                  >
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {section.label}
                    </span>
                    {section.collapsible && (
                      <button
                        onClick={() => toggleSection(section.label)}
                        className="p-1 rounded hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <motion.div
                          animate={{ rotate: openSections[section.label] ? 0 : -90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </motion.div>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.url;
                  const Icon = item.icon;
                  
                  return (
                    <motion.li
                      key={item.url}
                      variants={navItemVariants}
                      whileHover="hover"
                      className="relative"
                    >
                      <Link
                        href={item.url}
                        onClick={(e) => {
                          // CRITICAL: Never block navigation during background processes
                          // Let the default navigation happen immediately
                        }}
                        className={`group flex items-center  px-3 py-2 !transform-none rounded-lg transition-all duration-200 ${
                          isActive
                            ? "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20"
                            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                        }`}
                        // CRITICAL: Always allow navigation
                        style={{ pointerEvents: 'auto' }}
                      >
                        {/* Active Indicator */}
                        {isActive && (
                          <motion.div
                            variants={activeIndicatorVariants}
                            initial="hidden"
                            animate="visible"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full"
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          />
                        )}

                        {/* Icon */}
                        <div className={`flex items-center justify-center w-5 h-5 ${!collapsed ? 'mr-3' : ''} ${
                          isActive
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:bg-gray-100/50 dark:group-hover:bg-gray-800/50"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Text */}
                        <AnimatePresence mode="wait">
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              className="text-sm font-medium"
                            >
                              {item.title}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Tooltip for collapsed state */}
                        {collapsed && (
                          <Tooltip.Provider>
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <div className="absolute left-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
                                    {item.title}
                                  </div>
                                </div>
                              </Tooltip.Trigger>
                            </Tooltip.Root>
                          </Tooltip.Provider>
                        )}
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-4">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-1"
            >
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {BOTTOM_SECTION.label}
              </span>
              <ul className="space-y-1">
                {BOTTOM_SECTION.items.map((item) => {
                  const isActive = pathname === item.url;
                  const Icon = item.icon;
                  
                  return (
                    <li key={item.url}>
                      <Link
                        href={item.url}
                        onClick={(e) => {
                          // CRITICAL: Never block navigation during background processes
                          // Let the default navigation happen immediately
                        }}
                        className={`group flex items-center px-3 py-2 !transform-none rounded-lg transition-all duration-200 ${
                          isActive
                            ? "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20"
                            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                        }`}
                        // CRITICAL: Always allow navigation
                        style={{ pointerEvents: 'auto' }}
                      >
                        <div className={`flex items-center justify-center w-5 h-5 ${!collapsed ? 'mr-3' : ''} ${
                          isActive
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:bg-gray-100/50 dark:group-hover:bg-gray-800/50"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-4">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Pro Plan Active</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">© 2024 SmartAfter</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}