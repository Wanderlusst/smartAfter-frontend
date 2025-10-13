
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, ShoppingCart, Eye, BarChart3 } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

interface Purchase {
  id: string;
  category?: string;
  amount: string;
  vendor: string;
  date: string;
}

interface PurchaseBreakdownProps {
  data?: any;
  purchases?: Purchase[];
  totalSpent?: number;
}

const PurchaseBreakdown = ({ data, purchases = [], totalSpent = 0 }: PurchaseBreakdownProps) => {
  const { setChartModal } = useUIStore();
  
  // Prepare chart data from real purchases only
  const chartData = purchases
    .filter(purchase => {
      // More robust filtering
      if (!purchase) return false;
      if (!(purchase as any).category && !purchase.vendor) return false;
      
      // Handle different amount formats
      let amount = 0;
      if (typeof purchase.amount === 'string') {
        amount = parseFloat(purchase.amount.replace(/[₹,\s]/g, '') || '0');
      } else if (typeof purchase.amount === 'number') {
        amount = purchase.amount;
      } else if ((purchase as any).price) {
        // Fallback to price field
        const price = (purchase as any).price;
        amount = typeof price === 'string' 
          ? parseFloat(price.replace(/[₹,\s]/g, '') || '0')
          : price || 0;
      }
      
      return amount > 0;
    })
    .map(purchase => {
      // Safe amount parsing
      let amount = 0;
      if (typeof purchase.amount === 'string') {
        amount = parseFloat(purchase.amount.replace(/[₹,\s]/g, '') || '0');
      } else if (typeof purchase.amount === 'number') {
        amount = purchase.amount;
      } else if ((purchase as any).price) {
        const price = (purchase as any).price;
        amount = typeof price === 'string' 
          ? parseFloat(price.replace(/[₹,\s]/g, '') || '0')
          : price || 0;
      }
      
      return {
        category: (purchase as any).category || 'Other',
        amount: amount,
        vendor: purchase.vendor || 'Unknown',
        date: purchase.date
      };
    })
    .filter(item => item.amount > 0);

  // Debug: Log chart data processing

  // Group by category and sum amounts
  const categoryData = chartData.reduce((acc, item) => {
    const existing = acc.find(cat => cat.category === item.category);
    if (existing) {
      existing.amount += item.amount;
      existing.count += 1;
    } else {
      acc.push({
        category: item.category,
        amount: item.amount,
        count: 1
      });
    }
    return acc;
  }, [] as Array<{ category: string; amount: number; count: number }>);

  // Sort by amount descending
  const sortedCategoryData = categoryData.sort((a, b) => b.amount - a.amount);

  // Calculate total from real data
  const realTotalSpent = chartData.reduce((sum, item) => sum + item.amount, 0);
  
  // Check if we have real data
  const hasRealData = chartData.length > 0 && realTotalSpent > 0;

  const handleExpand = () => {
    if (hasRealData) {
      setChartModal(true, 'analytics');
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xl backdrop-blur-sm"
        >
          <div className="space-y-2">
            <div className="font-semibold text-gray-900">{label}</div>
            <div className="text-2xl font-bold text-purple-600">
              ₹{payload[0].value?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600">
              {payload[0].payload?.count || 0} purchases
            </div>
          </div>
        </motion.div>
      );
    }
    return null;
  };

  // Chart colors
  const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <Card 
        className={`border-0 transition-all duration-500 cursor-pointer group border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:shadow-xl shadow-sm ${
          hasRealData 
            ? 'hover:shadow-xl' 
            : ''
        }`}
        onClick={handleExpand}
      >
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl transition-colors ${
                  hasRealData ? 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <BarChart3 className={`w-6 h-6 ${
                    hasRealData ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                  }`} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Purchase Analytics
                  </CardTitle>
                  <p className="text-gray-600 dark:text-gray-300">
                    Spending breakdown by category
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  ₹{realTotalSpent?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total spent</div>
              </div>
              
              {hasRealData && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {hasRealData ? (
            <>
              {/* Chart */}
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedCategoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#A855F7" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.4} />
                    <XAxis 
                      dataKey="category" 
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#6B7280', fontWeight: 500 }}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₹${value.toLocaleString()}`}
                      tick={{ fill: '#6B7280', fontWeight: 500 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="amount" 
                      fill="url(#barGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={80}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedCategoryData.slice(0, 6).map((category, index) => (
                  <motion.div
                    key={`${category.category}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <Badge variant="outline" className="text-xs">
                        {category.count} items
                      </Badge>
                    </div>
                    <div className="font-semibold text-gray-900 mb-1">
                      {category.category}
                    </div>
                    <div className="text-lg font-bold text-purple-600">
                      ₹{category.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {((category.amount / realTotalSpent) * 100).toFixed(1)}% of total
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No purchase data yet
              </h3>
              <p className="text-gray-600 max-w-sm mx-auto mb-6">
                Connect your Gmail account to start tracking your purchases and see beautiful analytics like this.
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Connect Gmail Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PurchaseBreakdown;
