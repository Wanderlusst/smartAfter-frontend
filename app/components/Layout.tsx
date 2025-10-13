import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '../store/useUIStore';
import DashboardLayout from './layouts/DashboardLayout';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = usePathname();
  const isLandingPage = location === '/';

  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
};

export default Layout;
