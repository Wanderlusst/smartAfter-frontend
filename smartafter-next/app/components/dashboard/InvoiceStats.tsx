'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, FileText, AlertTriangle, Calendar } from 'lucide-react';

interface InvoiceStatsProps {
  stats: {
    totalInvoices: number;
    totalAmount: number;
    averageAmount: number;
    categories: { [key: string]: number };
    monthlySpending: { [key: string]: number };
    activeWarranties: number;
    expiringWarranties: number;
  };
  warrantyAlerts: Array<{
    id: string;
    merchant_name: string;
    purchase_date: string;
    warranty_end_date: string;
    days_remaining: number;
    total_amount: number;
    category: string;
  }>;
}

export function InvoiceStats({ stats, warrantyAlerts }: InvoiceStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTopCategories = () => {
    return Object.entries(stats.categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  };

  const getMonthlyTrend = () => {
    const months = Object.keys(stats.monthlySpending).sort();
    if (months.length < 2) return 0;
    
    const current = stats.monthlySpending[months[months.length - 1]] || 0;
    const previous = stats.monthlySpending[months[months.length - 2]] || 0;
    
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const monthlyTrend = getMonthlyTrend();
  const topCategories = getTopCategories();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          <p className="text-xs text-muted-foreground">
            Processed from Gmail
          </p>
        </CardContent>
      </Card>

      {/* Total Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {monthlyTrend > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={monthlyTrend > 0 ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(monthlyTrend).toFixed(1)}% from last month
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Average Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Invoice</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.averageAmount)}</div>
          <p className="text-xs text-muted-foreground">
            Per transaction
          </p>
        </CardContent>
      </Card>

      {/* Active Warranties */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Warranties</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeWarranties}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {stats.expiringWarranties > 0 && (
              <>
                <AlertTriangle className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-orange-500">
                  {stats.expiringWarranties} expiring soon
                </span>
              </>
            )}
            {stats.expiringWarranties === 0 && (
              <span>All warranties active</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Categories */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topCategories.map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm font-medium">{category}</span>
                <Badge variant="secondary">{count} invoices</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Warranty Alerts */}
      {warrantyAlerts.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
              Warranty Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {warrantyAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="text-sm font-medium">{alert.merchant_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(alert.total_amount)} • {alert.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={alert.days_remaining <= 7 ? "destructive" : "secondary"}
                    >
                      {alert.days_remaining} days left
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires: {new Date(alert.warranty_end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
