"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => ({ default: mod.PieChart })), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => ({ default: mod.Pie })), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => ({ default: mod.Cell })), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => ({ default: mod.LineChart })), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => ({ default: mod.Line })), { ssr: false });
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface ChartDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartType: 'spending' | 'analytics' | 'warranty' | null;
}

const ChartDetailModal = ({ isOpen, onClose, chartType }: ChartDetailModalProps) => {
  const spendingDetailData = [
    { month: 'Jan', spending: 45000, refunds: 2500, purchases: 12, avgOrder: 3750 },
    { month: 'Feb', spending: 52000, refunds: 3200, purchases: 15, avgOrder: 3467 },
    { month: 'Mar', spending: 48000, refunds: 1800, purchases: 11, avgOrder: 4364 },
    { month: 'Apr', spending: 61000, refunds: 4100, purchases: 18, avgOrder: 3389 },
    { month: 'May', spending: 55000, refunds: 2900, purchases: 14, avgOrder: 3929 },
    { month: 'Jun', spending: 68000, refunds: 3500, purchases: 20, avgOrder: 3400 },
  ];

  const analyticsDetailData = [
    { category: 'Electronics', amount: 125000, count: 12, avgPrice: 10417, topItem: 'iPhone 14 Pro' },
    { category: 'Fashion', amount: 78000, count: 28, avgPrice: 2786, topItem: 'Nike Air Force 1' },
    { category: 'Home', amount: 45000, count: 15, avgPrice: 3000, topItem: 'Coffee Maker' },
    { category: 'Books', amount: 18000, count: 45, avgPrice: 400, topItem: 'Programming Books' },
    { category: 'Health', amount: 32000, count: 8, avgPrice: 4000, topItem: 'Fitness Tracker' },
  ];

  const categoryBreakdown = [
    { name: 'High Value (>₹10k)', value: 35, color: '#8b5cf6' },
    { name: 'Medium (₹1k-₹10k)', value: 45, color: '#a855f7' },
    { name: 'Low (<₹1k)', value: 20, color: '#c084fc' },
  ];

  const warrantyDetailData = [
    { month: 'Jan', expiring: 2, active: 5, total: 7, avgValue: 15000 },
    { month: 'Feb', expiring: 1, active: 6, total: 7, avgValue: 18000 },
    { month: 'Mar', expiring: 0, active: 7, total: 7, avgValue: 22000 },
    { month: 'Apr', expiring: 1, active: 6, total: 7, avgValue: 19500 },
    { month: 'May', expiring: 3, active: 4, total: 7, avgValue: 25000 },
    { month: 'Jun', expiring: 2, active: 5, total: 7, avgValue: 21000 },
  ];

  const getTitle = () => {
    switch (chartType) {
      case 'spending':
        return 'Detailed Spending Analysis';
      case 'analytics':
        return 'Detailed Purchase Analytics';
      case 'warranty':
        return 'Detailed Warranty Timeline';
      default:
        return '';
    }
  };

  const renderSpendingDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white">Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendingDetailData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => `₹${value / 1000}k`}
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="spending" 
                    name="Spending" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="refunds" 
                    name="Refunds" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white">Purchase Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={false}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {spendingDetailData.map((month) => (
          <Card key={month.month} className="p-4 bg-white/5 backdrop-blur-xl border-white/10">
            <h4 className="font-semibold text-lg mb-2 text-white">{month.month} 2024</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Spending:</span>
                <Badge variant="secondary">₹{month.spending.toLocaleString()}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Refunds:</span>
                <Badge variant="outline">₹{month.refunds.toLocaleString()}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Purchases:</span>
                <span className="text-white">{month.purchases}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Order:</span>
                <span className="text-white">₹{month.avgOrder.toLocaleString()}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAnalyticsDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white">Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsDetailData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="category" 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => `₹${value / 1000}k`}
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Bar 
                    name="Amount" 
                    dataKey="amount" 
                    fill="#8b5cf6" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white">Purchase Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsDetailData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="category" 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Bar 
                    name="Count" 
                    dataKey="count" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyticsDetailData.map((category) => (
          <Card key={category.category} className="p-4 bg-white/5 backdrop-blur-xl border-white/10">
            <h4 className="font-semibold text-lg mb-2 text-white">{category.category}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Spent:</span>
                <Badge variant="secondary">₹{category.amount.toLocaleString()}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Items Bought:</span>
                <span className="text-white">{category.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Price:</span>
                <span className="text-white">₹{category.avgPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Top Item:</span>
                <span className="font-medium text-white">{category.topItem}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderWarrantyDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white">Warranty Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={warrantyDetailData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Bar 
                    name="Active" 
                    dataKey="active" 
                    fill="#E0E7FF" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    name="Expiring" 
                    dataKey="expiring" 
                    fill="#6366F1" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white">Warranty Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <Pie
                    data={[
                      { name: 'Active', value: 32, color: '#E0E7FF' },
                      { name: 'Expiring Soon', value: 8, color: '#6366F1' },
                      { name: 'Expired', value: 5, color: '#EF4444' },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {[
                      { name: 'Active', value: 32, color: '#E0E7FF' },
                      { name: 'Expiring Soon', value: 8, color: '#6366F1' },
                      { name: 'Expired', value: 5, color: '#EF4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {warrantyDetailData.map((month) => (
          <Card key={month.month} className="p-4 bg-white/5 backdrop-blur-xl border-white/10">
            <h4 className="font-semibold text-lg mb-2 text-white">{month.month} 2024</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Active Warranties:</span>
                <Badge variant="secondary">{month.active}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expiring:</span>
                <Badge variant="outline">{month.expiring}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total:</span>
                <span className="text-white">{month.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Value:</span>
                <span className="text-white">₹{month.avgValue.toLocaleString()}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border-white/10 text-white">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {chartType === 'spending' && renderSpendingDetails()}
          {chartType === 'analytics' && renderAnalyticsDetails()}
          {chartType === 'warranty' && renderWarrantyDetails()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartDetailModal;
