'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

// Lazy loading component with performance optimizations
export function LazyLoader({
  children,
  fallback = <DefaultFallback />,
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  className = '',
}: PerformanceOptimizerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (isVisible && !isLoaded && !hasError) {
      // Simulate loading delay for better UX
      const timer = setTimeout(() => {
        setIsLoaded(true);
        onLoad?.();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isVisible, isLoaded, hasError, onLoad]);

  if (hasError) {
    return (
      <div className={`error-container ${className}`}>
        <div className="text-red-500 text-center p-4">
          Failed to load content
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <AnimatePresence mode="wait">
        {!isLoaded ? (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {fallback}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Default fallback component
function DefaultFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    </div>
  );
}

// Virtual scrolling component for large lists
interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  className?: string;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  className = '',
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil(scrollTop / itemHeight) + visibleCount + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) =>
            renderItem(item, startIndex + index)
          )}
        </div>
      </div>
    </div>
  );
}

// Performance monitoring component
interface PerformanceMonitorProps {
  name: string;
  children: React.ReactNode;
  onRender?: (duration: number) => void;
}

export function PerformanceMonitor({
  name,
  children,
  onRender,
}: PerformanceMonitorProps) {
  const startTime = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - startTime.current;
    onRender?.(duration);
  }, [name, onRender]);

  return <>{children}</>;
}

// Image optimization component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`image-container ${className}`}>
      {!isLoaded && !hasError && (
        <div className="image-placeholder">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
      
      {hasError && (
        <div className="image-error">
          <span className="text-red-500 text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
}

// Bundle size analyzer component
export function BundleAnalyzer() {
  const [bundleSize, setBundleSize] = useState<{
    total: number;
    js: number;
    css: number;
    images: number;
  } | null>(null);

  useEffect(() => {
    // This would integrate with a bundle analyzer in production
    // For now, we'll simulate the data
    setBundleSize({
      total: 829, // MB from our build
      js: 650,
      css: 50,
      images: 129,
    });
  }, []);

  if (!bundleSize) return null;

  return (
    <div className="bundle-analyzer p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold mb-2">Bundle Size</h3>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Total:</span>
          <span>{(bundleSize.total / 1024).toFixed(1)} MB</span>
        </div>
        <div className="flex justify-between">
          <span>JavaScript:</span>
          <span>{(bundleSize.js / 1024).toFixed(1)} MB</span>
        </div>
        <div className="flex justify-between">
          <span>CSS:</span>
          <span>{(bundleSize.css / 1024).toFixed(1)} MB</span>
        </div>
        <div className="flex justify-between">
          <span>Images:</span>
          <span>{(bundleSize.images / 1024).toFixed(1)} MB</span>
        </div>
      </div>
    </div>
  );
} 