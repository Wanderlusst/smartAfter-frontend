import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import DashboardSkeleton from '@/app/components/dashboard/DashboardSkeleton';
// import EmailData from '@/app/components/EmailData'; // Commented out - not used

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/landing');
  }

  // COMMENTED OUT - Credit card data fetching disabled
  // Focus is now on email parsing only
  let dashboardData = {
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

  // Credit card data fetching completely disabled
  // try {
  //   const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  //   const response = await fetch(`${baseUrl}/api/dashboard-credit-card`, {
  //     cache: 'no-store'
  //   });
  //   // ... credit card logic commented out
  // } catch (error) {
  //   console.log('⚠️ Credit card data not available, using fallback');
  // }

  return (
    <DashboardClient 
      session={{ user: { email: session.user?.email || undefined, id: session.user?.id || undefined } }} 
      initialData={dashboardData}
      initialEmails={[]} 
    />
  );
}
