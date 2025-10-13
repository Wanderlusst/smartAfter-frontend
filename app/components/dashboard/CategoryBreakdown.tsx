'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { X, BarChart3, PieChart as PieChartIcon, Download, Share2, TrendingUp, TrendingDown } from 'lucide-react';

interface CategoryData {
  name: string;
  amount: number;
  value: number;
  color: string;
  percentage: number;
  items: number;
  trend: string;
}

interface CategoryBreakdownProps {
  categoryData: CategoryData[];
  onDrillDown: (type: string, data: any) => void;
}

export default function CategoryBreakdown({
  categoryData,
  onDrillDown
}: CategoryBreakdownProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedView, setSelectedView] = useState<'pie' | 'bar'>('pie');
  const [isLoading, setIsLoading] = useState(false);
  
  // Debug: Log incoming data
  // console.log removed

  const chartVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1
    }
  };

  // Safe data handling to prevent NaN - memoized for performance
  const safeCategoryData = useMemo(() => {
    if (!categoryData || categoryData.length === 0) return [];
    
    // Group by category name and sum amounts to avoid duplicates
    const groupedData = categoryData.reduce((acc, category) => {
      const existing = acc.find(item => item.name === category.name);
      if (existing) {
        existing.amount += category.amount || 0;
        existing.value += category.value || 0;
        existing.items += category.items || 1;
      } else {
        acc.push({
          ...category,
          items: category.items || 1
        });
      }
      return acc;
    }, [] as CategoryData[]);
    
    // Calculate percentages after grouping
    const totalAmount = groupedData.reduce((sum, cat) => sum + (cat.amount || 0), 0);
    const result = groupedData.map(category => ({
      ...category,
      percentage: totalAmount > 0 ? ((category.amount || 0) / totalAmount) * 100 : 0
    }));
    
    // Debug: Log grouped data

    return result;
  }, [categoryData]);
  const totalSpent = useMemo(() => safeCategoryData.reduce((sum, category) => sum + (category.amount || 0), 0), [safeCategoryData]);
  const topCategory = useMemo(() => safeCategoryData.length > 0 ? safeCategoryData[0] : null, [safeCategoryData]);
  const avgPerCategory = useMemo(() => safeCategoryData.length > 0 ? totalSpent / safeCategoryData.length : 0, [safeCategoryData, totalSpent]);

  // Check if we have data to display
  const hasData = useMemo(() => safeCategoryData.length > 0 && totalSpent > 0, [safeCategoryData, totalSpent]);

  const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#ea580c', '#7c3aed', '#0891b2']; // Blue, Green, Red, Orange, Purple, Cyan

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl"
        >
          <p className="font-medium text-gray-900 dark:text-gray-100">{data.name}</p>
          <p className="text-blue-600 dark:text-blue-400 font-semibold">
            ₹{data.value?.toFixed(2) || '0.00'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.payload?.percentage?.toFixed(1) || '0'}% of total
          </p>
        </motion.div>
      );
    }
    return null;
  };

  const handleChartClick = useCallback(() => {
    // console.log removed
    if (hasData && !isLoading) {
      setIsLoading(true);
      // console.log removed
      
      // Small delay to prevent UI blocking
      setTimeout(() => {
        setIsModalOpen(true);
        setIsLoading(false);
      }, 100);
    } else {
      // console.log removed
    }
  }, [hasData, isLoading]);

  return (
    <>
      <motion.div
        variants={chartVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.6, delay: 0.4 }}
        className="chart-container"
      >
        <Card className={`border-0 bg-gray-900/90 backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-700/50 shadow-xl ${isLoading ? 'opacity-75' : ''}`} onClick={handleChartClick}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-100">
                  Category Breakdown
                </CardTitle>
                <p className="text-sm text-gray-300">
                  Spending distribution by category
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {hasData ? `${safeCategoryData.length} Categories` : 'No data'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-100">
                  {topCategory?.name || 'N/A'}
                </p>
                <p className="text-sm text-blue-200/80">Top Category</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-100">
                  ₹{avgPerCategory.toFixed(2)}
                </p>
                <p className="text-sm text-blue-200/80">Avg per Category</p>
              </div>
            </div>

            {/* Charts Grid - Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Side - Pie Chart */}
              <div className="h-64 w-full">
                {hasData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={safeCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} ${percentage}%`}
                        outerRadius={80}
                        fill="#3B82F6"
                        dataKey="amount"
                      >
                        {safeCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                        <PieChartIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-300 text-sm">
                        No category data available
                      </p>
                      <p className="text-gray-400 text-xs">
                        Add purchases to see category breakdown
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Category Cards */}
              {hasData && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-100 mb-4">Category Details</h4>
                  <div className="space-y-4">
                    {safeCategoryData.slice(0, 3).map((category, index) => (
                      <motion.div
                        key={`${category.name}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-5 h-5 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div>
                              <span className="text-base font-semibold text-gray-100">{category.name}</span>
                              <p className="text-sm text-gray-300">{category.items || 0} items</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-100">
                              ₹{category.amount?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-sm text-gray-300">
                              {category.percentage?.toFixed(1) || '0'}%
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Category Analysis
                </DialogTitle>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Detailed breakdown of spending by category
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Quick Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{safeCategoryData.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalSpent.toFixed(2)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{safeCategoryData.reduce((sum, cat) => sum + (cat.items || 0), 0)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Items</div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={selectedView === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('pie')}
                className="flex items-center gap-2"
              >
                <PieChartIcon className="w-4 h-4" />
                Pie Chart
              </Button>
              <Button
                variant={selectedView === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('bar')}
                className="flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Bar Chart
              </Button>
            </div>

            {/* Chart */}
            <div className="h-96 border rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50">
              <ResponsiveContainer width="100%" height="100%">
                {selectedView === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                ) : (
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E40AF" strokeOpacity={0.3} />
                    <XAxis dataKey="name" stroke="#93C5FD" fontSize={12} />
                    <YAxis stroke="#93C5FD" fontSize={12} tickFormatter={(value) => value.toFixed(2)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Detailed Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Categories</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{categoryData.length}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Spent</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-green-600 dark:text-green-400">Top Category</h4>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{topCategory?.name || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400">Avg per Category</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgPerCategory.toFixed(2)}</p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">All Categories</h3>
              <div className="space-y-3">
                {categoryData.map((category, index) => (
                  <div key={`${category.name}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{category.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{category.items} items</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {category.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{category.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="w-4 h-4" />
                Export Data
              </Button>
              <Button variant="outline" className="flex items-center gap-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                <Share2 className="w-4 h-4" />
                Share Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 