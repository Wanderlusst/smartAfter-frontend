'use client';

import React, { ReactNode, useMemo, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ProProvider } from '../contexts/ProContext';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { TooltipProvider } from './ui/tooltip';
import { Toaster } from './ui/toaster';
import { Toaster as Sonner } from "sonner";
import { ThemeProvider } from './theme/theme-provider';
import SmartBot from "./SmartBot";
import ClientOnly from './ClientOnly';
import AppSidebar from './Sidebar';
import RouteCache from './RouteCache';
import RoutePrefetcher from './RoutePrefetcher';
import RoutePreloader from './RoutePreloader';
// ReactBits components
import { LoadingSpinner, FadeInText, AnimatedButton } from './reactbits';
interface ClientLayoutWrapperProps {
  children: ReactNode;
  fontClass: string;
  session?: { user?: { email?: string; name?: string } };
}

// Separate component that uses useSession (wrapped by SessionProvider)
function AuthenticatedLayout({ children, fontClass, session }: ClientLayoutWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: clientSession, status } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const { } = useSidebar();

  // Check if user is authenticated
  const isAuthenticated = clientSession?.user?.email || session?.user?.email;
  const isAuthLoading = status === 'loading';

  // Prefetch routes for faster navigation
  const prefetchRoutes = () => {
    // Prefetch the main routes
    router.prefetch('/purchases');
    router.prefetch('/warranties');
    router.prefetch('/refunds');
    router.prefetch('/inbox');
    router.prefetch('/documents');
  };

  // Only run background processes for authenticated users
  useEffect(() => {
    if (!isAuthenticated || isAuthLoading) return;
    
    // Prefetch routes for faster navigation
    prefetchRoutes();
    
    // Preload route data in background for instant switching (temporarily disabled to prevent 405 errors)
    // setTimeout(() => {
    //   preloadRouteData();
    // }, 500); // Reduced delay for faster optimization
  }, [isAuthenticated, isAuthLoading, prefetchRoutes]);

  // Determine if sidebar should be hidden for certain pages
  const hideSidebar = useMemo(() => {
    const publicPages = ['/landing', '/pricing', '/auth/signin', '/auth/signup'];
    const isPublicPage = publicPages.includes(pathname);
    
    // Hide sidebar for public pages OR if user is not authenticated
    return isPublicPage || !isAuthenticated;
  }, [pathname, isAuthenticated]);

  const handleSync = async () => {
    if (isSyncing || !isAuthenticated) return;
    
    setIsSyncing(true);
    try {
      
      // Background sync disabled - no fast API calls
      
    } catch {
      
    } finally {
      setIsSyncing(false);
    }
  };

  // PERFORMANCE FIX: Optimize QueryClient for faster route switching
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 60 * 1000, // 30 minutes - longer cache
        gcTime: 60 * 60 * 1000, // 1 hour - keep data longer
        retry: 1, // Minimal retries
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        // Disable queries for unauthenticated users
        enabled: !!isAuthenticated,
        // PERFORMANCE: Use cached data immediately
        placeholderData: (previousData) => previousData,
      },
    },
  }), [isAuthenticated]);

  // Show loading state while checking authentication - NON-BLOCKING
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner 
            size="lg" 
            variant="spinner" 
            color="#3B82F6" 
            text="Loading SmartAf..."
          />
          <FadeInText 
            text="Welcome to SmartAf"
            className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-4"
            delay={0.5}
            direction="fade"
          />
          {/* Allow navigation even during loading */}
          <div className="mt-6 space-y-3">
            <AnimatedButton
              variant="outline"
              size="sm"
              animation="pulse"
              hoverEffect="lift"
              onClick={() => window.location.href = '/landing'}
            >
              Go to Landing Page
            </AnimatedButton>
            <br />
            <AnimatedButton
              variant="outline"
              size="sm"
              animation="pulse"
              hoverEffect="lift"
              onClick={() => window.location.href = '/pricing'}
            >
              View Pricing
            </AnimatedButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
        <ClientOnly>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ProProvider>
              <TooltipProvider>
                <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 ${fontClass}`}>
                  <div className="flex h-screen overflow-hidden">
                    {/* Sidebar - Only show for authenticated users */}
                    <AnimatePresence mode="wait">
                      {!hideSidebar && isAuthenticated && (
                        <AppSidebar />
                      )}
                    </AnimatePresence>
                    
                    {/* Main Content - PERFORMANCE OPTIMIZED */}
                    <motion.main 
                      className={`flex-1 overflow-hidden relative z-10 transition-all duration-150`}
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05, duration: 0.15 }}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <div className="h-full overflow-y-auto overflow-x-hidden">
                        <motion.div
                          key={pathname}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.1 }}
                          className="min-h-full"
                        >
                          {children}
                        </motion.div>
                      </div>
                    </motion.main>
                  </div>
                  {isAuthenticated && (
                    <>
                      <SmartBot />
        <RouteCache />
        <RoutePrefetcher />
        <RoutePreloader />
                    </>
                  )}
                </div>
                <Toaster />
                <Sonner />
              </TooltipProvider>
            </ProProvider>
          </ThemeProvider>
        </ClientOnly>
      </QueryClientProvider>
  );
}

function ClientLayoutWrapper({ children, fontClass, session }: ClientLayoutWrapperProps) {
  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <AuthenticatedLayout fontClass={fontClass} session={session}>
          {children}
        </AuthenticatedLayout>
      </SidebarProvider>
    </SessionProvider>
  );
}

export default ClientLayoutWrapper; 