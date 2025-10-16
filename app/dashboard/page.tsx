import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { LoadingProvider } from '@/app/contexts/LoadingContext';

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/landing');
  }

  // Initial shell data - client will load real data
  const dashboardData = {
    totalSpent: 0,
    purchaseCount: 0,
    activeWarranties: 0,
    documents: { total: 0, receipts: 0, invoices: 0 },
    refundable: { amount: 0, percentage: 0 },
    purchases: [],
    refundOpportunities: [],
    warranties: [],
    source: 'ssr-shell',
    hasInitialData: false,
    message: 'Dashboard loaded - focusing on email parsing...'
  };

  return (
    <LoadingProvider>
      <DashboardClient 
        session={session}
        initialData={dashboardData}
        initialEmails={[]} 
      />
    </LoadingProvider>
  );
}
