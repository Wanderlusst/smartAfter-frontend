'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { routeTransitionVariants, routeTransitionConfig, initializeCriticalRoutes, PageTransitionProps } from '../lib/routeTransitions';
import { cn } from '../lib/utils';

export default function PageTransition({ children, className }: PageTransitionProps) {
  useEffect(() => {
    // Initialize critical route preloading on mount
    initializeCriticalRoutes();
  }, []);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={routeTransitionVariants}
      transition={routeTransitionConfig}
      className={cn("w-full", className)}
    >
      {children}
    </motion.div>
  );
} 