import { Variants } from 'framer-motion';

// Page transitions
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 0.98,
  },
};

export const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.6,
};

// Stagger animations for lists - Smooth and fluid
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
};

export const itemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'tween',
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
};

// Card animations - Ultra smooth with gentle easing
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'tween',
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
  hover: {
    y: -6,
    scale: 1.015,
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
  tap: {
    scale: 0.985,
    transition: {
      type: 'tween',
      duration: 0.15,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
};

// Button animations - Smooth and responsive
export const buttonVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.03,
    transition: {
      type: 'tween',
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
  tap: {
    scale: 0.97,
    transition: {
      type: 'tween',
      duration: 0.1,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
};

// Modal animations
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

// Sidebar animations
export const sidebarVariants: Variants = {
  hidden: {
    x: -300,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: -300,
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

// Navigation item animations - Smooth and fluid
export const navItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'tween',
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
  hover: {
    scale: 1.01,
    x: 3,
    transition: {
      type: 'tween',
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
  tap: {
    scale: 0.99,
    transition: {
      type: 'tween',
      duration: 0.1,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
};

// Loading animations
export const loadingVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.2,
    },
  },
};

// Pulse animation for status indicators
export const pulseVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Floating animation - Ultra smooth and gentle
export const floatingVariants: Variants = {
  initial: {
    y: 0,
  },
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
};

// Text reveal animation - Smooth and elegant
export const textRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'tween',
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
    },
  },
};

// Chart animations - Smooth and elegant
export const chartVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'tween',
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier
      delay: 0.2,
    },
  },
};

// Notification animations
export const notificationVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 300,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    x: 300,
    scale: 0.8,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
};

// Chat bubble animations
export const chatBubbleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -180,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  tap: {
    scale: 0.9,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

// Chat window animations
export const chatWindowVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: 50,
    scale: 0.9,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

// Message animations
export const messageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
};

// Progress bar animations
export const progressVariants: Variants = {
  hidden: {
    width: 0,
  },
  visible: {
    width: '100%',
    transition: {
      duration: 1.5,
      ease: 'easeInOut',
    },
  },
};

// Shimmer animation
export const shimmerVariants: Variants = {
  initial: {
    x: '-100%',
  },
  animate: {
    x: '100%',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Custom spring configurations
export const springConfigs = {
  gentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
  },
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 20,
  },
  smooth: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  quick: {
    type: 'spring',
    stiffness: 500,
    damping: 25,
  },
};

// Easing functions
export const easing = {
  easeOut: [0.4, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  sharp: [0.4, 0, 0.6, 1],
  smooth: [0.25, 0.46, 0.45, 0.94],
};

// Animation presets for common use cases
export const animationPresets = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  rotateIn: {
    initial: { opacity: 0, rotate: -180 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 180 },
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}; 