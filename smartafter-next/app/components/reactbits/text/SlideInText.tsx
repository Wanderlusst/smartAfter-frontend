'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface SlideInTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  trigger?: 'onMount' | 'onScroll' | 'onHover' | 'onClick';
  once?: boolean;
  children?: React.ReactNode;
}

const SlideInText: React.FC<SlideInTextProps> = ({
  text,
  className = '',
  delay = 0,
  duration = 0.6,
  direction = 'up',
  trigger = 'onMount',
  once = true,
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: 50, opacity: 0 };
      case 'down':
        return { y: -50, opacity: 0 };
      case 'left':
        return { x: 50, opacity: 0 };
      case 'right':
        return { x: -50, opacity: 0 };
      default:
        return { y: 50, opacity: 0 };
    }
  };

  const getAnimatePosition = () => {
    switch (direction) {
      case 'up':
        return { y: 0, opacity: 1 };
      case 'down':
        return { y: 0, opacity: 1 };
      case 'left':
        return { x: 0, opacity: 1 };
      case 'right':
        return { x: 0, opacity: 1 };
      default:
        return { y: 0, opacity: 1 };
    }
  };

  useEffect(() => {
    if (trigger === 'onMount') {
      const timer = setTimeout(() => {
        setIsVisible(true);
        controls.start('animate');
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [trigger, delay, controls]);

  useEffect(() => {
    if (trigger === 'onScroll' && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            controls.start('animate');
            if (once) {
              observer.disconnect();
            }
          } else if (!once) {
            controls.start('initial');
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [trigger, controls, once]);

  const handleMouseEnter = () => {
    if (trigger === 'onHover') {
      setIsVisible(true);
      controls.start('animate');
    }
  };

  const handleClick = () => {
    if (trigger === 'onClick') {
      setIsVisible(true);
      controls.start('animate');
    }
  };

  return (
    <motion.div
      ref={ref}
      className={`slide-in-text ${className}`}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      initial="initial"
      animate={controls}
      variants={{
        initial: getInitialPosition(),
        animate: getAnimatePosition()
      }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {text}
      {children}
    </motion.div>
  );
};

export default SlideInText;
