import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardMinimal() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/landing');
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Dashboard (Minimal)
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {session.user?.name || 'User'}!</h2>
          <p className="text-gray-600">
            This is a minimal dashboard page to test for webpack errors.
          </p>
          
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">
              If you can see this page without webpack errors, the issue is in the complex dashboard components.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 