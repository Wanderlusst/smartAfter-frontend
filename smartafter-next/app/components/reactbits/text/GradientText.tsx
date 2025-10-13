'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GradientTextProps {
  text: string;
  className?: string;
  gradient?: string;
  animated?: boolean;
  delay?: number;
  duration?: number;
  children?: React.ReactNode;
}

const GradientText: React.FC<GradientTextProps> = ({
  text,
  className = '',
  gradient = 'from-blue-500 via-purple-500 to-pink-500',
  animated = false,
  delay = 0,
  duration = 3,
  children
}) => {
  const gradientClasses = `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`;

  return (
    <motion.span
      className={`gradient-text ${gradientClasses} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      {animated ? (
        <motion.span
          className="inline-block"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{
            backgroundSize: '200% 200%'
          }}
        >
          {text}
        </motion.span>
      ) : (
        text
      )}
      {children}
    </motion.span>
  );
};

export default GradientText;
