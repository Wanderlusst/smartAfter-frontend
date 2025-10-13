
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip } from './ui/chart';
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false });
import { Expand } from 'lucide-react';

const data = [
  { category: 'Electronics', amount: 125000, count: 12 },
  { category: 'Fashion', amount: 78000, count: 28 },
  { category: 'Home', amount: 45000, count: 15 },
  { category: 'Books', amount: 18000, count: 45 },
  { category: 'Health', amount: 32000, count: 8 },
];

const chartConfig = {
  amount: {
    label: "Amount",
    color: "#8b5cf6",
  },
};

interface PurchaseAnalyticsChartProps {
  onExpand?: () => void;
}

const PurchaseAnalyticsChart = ({ onExpand }: PurchaseAnalyticsChartProps) => {
  return (
    <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={onExpand}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Purchase Analytics
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Spending breakdown by category
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">₹2.98L</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total spent</p>
            </div>
            <Expand className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="category" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'currentColor' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'currentColor' }}
              tickFormatter={(value) => `₹${value / 1000}k`}
            />
            <ChartTooltip 
              
              formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
              labelFormatter={(label) => `${label} Category`}
            />
            <Bar
              dataKey="amount"
              fill="url(#barGradient)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default PurchaseAnalyticsChart;
