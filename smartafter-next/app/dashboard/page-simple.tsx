import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardSimple() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/landing');
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard (Simple)</h1>
      <p>Welcome, {session.user.email}</p>
      <div className="mt-4 p-4 bg-green-100 rounded">
        <p>If you can see this, the dashboard is working without complex imports.</p>
      </div>
    </div>
  );
} 