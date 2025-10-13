'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AppSidebar from '../Sidebar';
import { LoginButton } from '../../../components/auth/LoginButton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Welcome to SmartAf</h1>
          <p className="mb-6 text-gray-600">
            Sign in with your Google account to access your purchase history and analytics.
          </p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar */}
      <aside className="relative z-30 h-full w-64 bg-[#0D1117] border-r border-slate-800 flex flex-col">
        <AppSidebar />
      </aside>
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}