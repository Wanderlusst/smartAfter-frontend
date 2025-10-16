'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider } from './SidebarContext';
import AppSidebar from './Sidebar';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Pages that should NOT have sidebar
  const noSidebarPages = ['/landing', '/api/auth/signin', '/api/auth/signout'];
  
  const shouldShowSidebar = !noSidebarPages.includes(pathname);

  if (!shouldShowSidebar) {
    // For landing page and auth pages, render without sidebar
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  // For all other pages, render with sidebar
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
