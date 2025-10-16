"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { LoadingProvider } from '@/app/contexts/LoadingContext';

interface DashboardClientSimpleProps {
  initialData: any;
  initialEmails: any[];
}

export default function DashboardClientSimple({ initialData, initialEmails }: DashboardClientSimpleProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  return (
    <LoadingProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Dashboard (Simple Version)
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            This is a simplified version of the dashboard.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            User: {session?.user?.email || 'Unknown'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Status: {status}
          </p>
        </div>
      </div>
    </LoadingProvider>
  );
}
