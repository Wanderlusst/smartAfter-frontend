'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LoadingPulseProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
  text?: string;
  count?: number;
}

const LoadingPulse: React.FC<LoadingPulseProps> = ({
  size = 'md',
  color = 'currentColor',
  className = '',
  text,
  count = 3
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-6 h-6'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="flex space-x-1">
        {Array.from({ length: count }).map((_, index) => (
          <motion.div
            key={index}
            className={`rounded-full ${sizeClasses[size]}`}
            style={{ backgroundColor: color }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.2,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>
      {text && (
        <motion.p
          className="mt-2 text-sm text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingPulse;
