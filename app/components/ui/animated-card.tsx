'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cardVariants } from '@/app/lib/animations';
import { cn } from '@/app/lib/utils';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
  onClick?: () => void;
  interactive?: boolean;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  hover = true,
  delay = 0,
  onClick,
  interactive = false,
}) => {
  return (
    <motion.div
      className={cn(
        'backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl',
        interactive && 'cursor-pointer',
        className
      )}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={hover ? "hover" : undefined}
      whileTap={interactive ? "tap" : undefined}
      onClick={onClick}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard; 