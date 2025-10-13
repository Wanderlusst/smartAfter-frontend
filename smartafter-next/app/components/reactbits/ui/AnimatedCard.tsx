'use client';

import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'glass';
  hover?: 'lift' | 'glow' | 'scale' | 'rotate' | 'none';
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scaleIn' | 'none';
  delay?: number;
  duration?: number;
  interactive?: boolean;
  children: React.ReactNode;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  variant = 'default',
  hover = 'lift',
  animation = 'fadeIn',
  delay = 0,
  duration = 0.3,
  interactive = false,
  className,
  children,
  ...props
}) => {
  const baseClasses = 'rounded-lg transition-all duration-200';

  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
    outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
    filled: 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
    glass: 'bg-white/10 dark:bg-gray-800/10 backdrop-blur-md border border-white/20 dark:border-gray-700/20'
  };

  const getAnimationVariants = () => {
    switch (animation) {
      case 'fadeIn':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
      case 'slideUp':
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 }
        };
      case 'slideDown':
        return {
          initial: { opacity: 0, y: -20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 20 }
        };
      case 'slideLeft':
        return {
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 }
        };
      case 'slideRight':
        return {
          initial: { opacity: 0, x: -20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 20 }
        };
      case 'scaleIn':
        return {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.9 }
        };
      default:
        return {};
    }
  };

  const getHoverVariants = () => {
    switch (hover) {
      case 'lift':
        return {
          hover: { y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }
        };
      case 'glow':
        return {
          hover: { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }
        };
      case 'scale':
        return {
          hover: { scale: 1.02 }
        };
      case 'rotate':
        return {
          hover: { rotate: 2 }
        };
      default:
        return {};
    }
  };

  const animationVariants = getAnimationVariants();
  const hoverVariants = getHoverVariants();

  return (
    <motion.div
      className={cn(
        baseClasses,
        variantClasses[variant],
        interactive && 'cursor-pointer',
        className
      )}
      initial={animationVariants.initial}
      animate={animationVariants.animate}
      exit={animationVariants.exit}
      whileHover={hoverVariants.hover}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;
