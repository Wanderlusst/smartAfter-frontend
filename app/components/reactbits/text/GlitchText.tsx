'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface GlitchTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  intensity?: 'low' | 'medium' | 'high';
  trigger?: 'onMount' | 'onHover' | 'onClick';
  children?: React.ReactNode;
}

const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  className = '',
  delay = 0,
  duration = 0.1,
  intensity = 'medium',
  trigger = 'onMount',
  children
}) => {
  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchText, setGlitchText] = useState(text);

  const getIntensityValues = () => {
    switch (intensity) {
      case 'low':
        return { skew: 2, translateX: 2, translateY: 1 };
      case 'high':
        return { skew: 8, translateX: 8, translateY: 4 };
      case 'medium':
      default:
        return { skew: 4, translateX: 4, translateY: 2 };
    }
  };

  const generateGlitchText = (originalText: string) => {
    const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    return originalText
      .split('')
      .map(char => {
        if (char === ' ') return char;
        return Math.random() < 0.3 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : char;
      })
      .join('');
  };

  useEffect(() => {
    if (trigger === 'onMount') {
      const timer = setTimeout(() => {
        startGlitch();
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [trigger, delay]);

  const startGlitch = () => {
    setIsGlitching(true);
    setGlitchText(generateGlitchText(text));

    const glitchInterval = setInterval(() => {
      setGlitchText(generateGlitchText(text));
    }, 50);

    setTimeout(() => {
      clearInterval(glitchInterval);
      setGlitchText(text);
      setIsGlitching(false);
    }, duration * 1000);
  };

  const handleMouseEnter = () => {
    if (trigger === 'onHover') {
      startGlitch();
    }
  };

  const handleClick = () => {
    if (trigger === 'onClick') {
      startGlitch();
    }
  };

  const intensityValues = getIntensityValues();

  return (
    <motion.div
      className={`glitch-text ${className}`}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      animate={isGlitching ? {
        skewX: [0, intensityValues.skew, -intensityValues.skew, 0],
        x: [0, intensityValues.translateX, -intensityValues.translateX, 0],
        y: [0, intensityValues.translateY, -intensityValues.translateY, 0]
      } : {}}
      transition={{
        duration: duration,
        ease: 'easeInOut'
      }}
    >
      <motion.span
        className="relative inline-block"
        animate={isGlitching ? {
          color: ['#ff0000', '#00ff00', '#0000ff', '#ffffff']
        } : {}}
        transition={{
          duration: duration,
          ease: 'easeInOut'
        }}
      >
        {glitchText}
      </motion.span>
      {children}
    </motion.div>
  );
};

export default GlitchText;
