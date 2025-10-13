"use client";

import React from 'react';
import DashboardCard from './DashboardCard';
import { motion } from 'framer-motion';

// Example of how to use the new DashboardCard with your existing data structure
const ExampleUsage = () => {
  // This would come from your SSR data
  const initialData = {
    totalSpent: 8969.97,
    purchaseCount: 6,
    activeWarranties: 2,
    documents: { total: 12 },
    refundable: { amount: 448.50 }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Dashboard Overview
      </h2>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
      >
        {/* Total Spent - Shows currency formatting */}
        <DashboardCard
          title="Total Spent"
          value={initialData.totalSpent}
          subtitle="This month"
          icon="₹"
          gradient="from-emerald-500 to-emerald-600"
          trend="up"
          percentage="+12.5%"
        />

        {/* Purchase Count - Shows number formatting */}
        <DashboardCard
          title="Purchases"
          value={initialData.purchaseCount}
          subtitle="Total transactions"
          icon="🛒"
          gradient="from-blue-500 to-blue-600"
          trend="neutral"
        />

        {/* Active Warranties */}
        <DashboardCard
          title="Active Warranties"
          value={initialData.activeWarranties}
          subtitle="Valid warranties"
          icon="🛡️"
          gradient="from-purple-500 to-purple-600"
          trend="up"
          percentage="+2"
        />

        {/* Documents */}
        <DashboardCard
          title="Documents"
          value={initialData.documents.total}
          subtitle="Receipts & invoices"
          icon="📄"
          gradient="from-orange-500 to-orange-600"
          trend="neutral"
        />

        {/* Refundable Amount */}
        <DashboardCard
          title="Refundable"
          value={initialData.refundable.amount}
          subtitle="Potential refunds"
          icon="💰"
          gradient="from-green-500 to-green-600"
          trend="up"
          percentage="+8.3%"
        />
      </motion.div>

      {/* Explanation of how it works */}
      <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          How the Stale-While-Revalidate Pattern Works
        </h3>
        
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong>Initial Load:</strong> Cards show SSR data immediately for fast page load
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong>Data Refresh:</strong> Manual refresh only - no background fetching
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong>UI Updates:</strong> Cards update smoothly when new data arrives
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong>Syncing Indicator:</strong> Shows "🔄 Syncing..." during background updates
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExampleUsage; 