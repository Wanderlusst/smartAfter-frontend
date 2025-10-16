'use client';

import React, { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';

interface PageWrapperProps {
  children: ReactNode;
  fontClass: string;
  session?: { user?: { email?: string; name?: string } };
  showSidebar?: boolean;
}

export default function PageWrapper({ children, fontClass, session }: PageWrapperProps) {
  return (
    <SessionProvider session={session}>
      <div className={`min-h-screen ${fontClass}`}>
        {children}
      </div>
    </SessionProvider>
  );
}
