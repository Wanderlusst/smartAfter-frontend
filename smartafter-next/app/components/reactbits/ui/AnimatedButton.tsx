'use client';

import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  animation?: 'bounce' | 'pulse' | 'shake' | 'glow' | 'ripple' | 'none';
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'rotate' | 'none';
  children: React.ReactNode;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'default',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  animation = 'none',
  hoverEffect = 'lift',
  className,
  children,
  disabled,
  ...props
}) => {
  const baseClasses = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    default: 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500',
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-lg'
  };

  const getAnimationVariants = () => {
    switch (animation) {
      case 'bounce':
        return {
          initial: { scale: 1 },
          animate: { scale: [1, 1.05, 1] },
          transition: { duration: 0.6, repeat: Infinity, repeatDelay: 2 }
        };
      case 'pulse':
        return {
          initial: { scale: 1 },
          animate: { scale: [1, 1.02, 1] },
          transition: { duration: 1.5, repeat: Infinity }
        };
      case 'shake':
        return {
          initial: { x: 0 },
          animate: { x: [-2, 2, -2, 2, 0] },
          transition: { duration: 0.5, repeat: Infinity, repeatDelay: 3 }
        };
      case 'glow':
        return {
          initial: { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)' },
          animate: { boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)' },
          transition: { duration: 1.5, repeat: Infinity }
        };
      default:
        return {};
    }
  };

  const getHoverVariants = () => {
    switch (hoverEffect) {
      case 'lift':
        return {
          hover: { y: -2, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)' }
        };
      case 'glow':
        return {
          hover: { boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)' }
        };
      case 'scale':
        return {
          hover: { scale: 1.05 }
        };
      case 'rotate':
        return {
          hover: { rotate: 5 }
        };
      default:
        return {};
    }
  };

  const animationProps = getAnimationVariants();
  const hoverProps = getHoverVariants();

  return (
    <motion.button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      initial={animationProps.initial}
      animate={animationProps.animate}
      transition={animationProps.transition}
      whileHover={hoverProps.hover}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {loading && (
        <motion.div
          className="mr-2"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </motion.div>
      )}

      {!loading && icon && iconPosition === 'left' && (
        <motion.div
          className="mr-2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
      )}

      <motion.span
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        {children}
      </motion.span>

      {!loading && icon && iconPosition === 'right' && (
        <motion.div
          className="ml-2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
      )}
    </motion.button>
  );
};

export default AnimatedButton;
