'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TypewriterTextProps {
  text: string | string[];
  className?: string;
  speed?: number;
  delay?: number;
  loop?: boolean;
  cursor?: boolean;
  cursorChar?: string;
  cursorBlinkSpeed?: number;
  onComplete?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  className = '',
  speed = 50,
  delay = 0,
  loop = false,
  cursor = true,
  cursorChar = '|',
  cursorBlinkSpeed = 500,
  onComplete
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  const texts = Array.isArray(text) ? text : [text];
  const currentText = texts[currentTextIndex];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDeleting) {
        setDisplayText(currentText.substring(0, currentIndex - 1));
        setCurrentIndex(currentIndex - 1);
      } else {
        setDisplayText(currentText.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, isDeleting, currentText, speed]);

  useEffect(() => {
    if (!isDeleting && currentIndex === currentText.length) {
      if (currentTextIndex < texts.length - 1) {
        setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      } else if (loop) {
        setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      } else {
        onComplete?.();
      }
    }

    if (isDeleting && currentIndex === 0) {
      setIsDeleting(false);
      if (currentTextIndex < texts.length - 1) {
        setCurrentTextIndex(currentTextIndex + 1);
      } else if (loop) {
        setCurrentTextIndex(0);
      }
    }
  }, [currentIndex, isDeleting, currentText.length, currentTextIndex, texts.length, loop, onComplete]);

  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor(prev => !prev);
    }, cursorBlinkSpeed);

    return () => clearInterval(cursorTimer);
  }, [cursorBlinkSpeed]);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      setCurrentIndex(0);
      setDisplayText('');
      setIsDeleting(false);
    }, delay);

    return () => clearTimeout(initialDelay);
  }, [delay]);

  return (
    <motion.div
      className={`typewriter-text ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <span className="inline-block">
        {displayText}
        {cursor && (
          <motion.span
            className="inline-block ml-1"
            animate={{ opacity: showCursor ? 1 : 0 }}
            transition={{ duration: 0.1 }}
          >
            {cursorChar}
          </motion.span>
        )}
      </span>
    </motion.div>
  );
};

export default TypewriterText;