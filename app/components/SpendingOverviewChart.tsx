
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip } from './ui/chart';
import dynamic from 'next/dynamic';

const AreaChart = dynamic(() => import('recharts').then(mod => ({ default: mod.AreaChart })), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => ({ default: mod.Area })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false });
import { Expand } from 'lucide-react';

const data = [
  { month: 'Jan', spending: 45000, refunds: 2500 },
  { month: 'Feb', spending: 52000, refunds: 3200 },
  { month: 'Mar', spending: 48000, refunds: 1800 },
  { month: 'Apr', spending: 61000, refunds: 4100 },
  { month: 'May', spending: 55000, refunds: 2900 },
  { month: 'Jun', spending: 68000, refunds: 3500 },
];

const chartConfig = {
  spending: {
    label: "Spending",
    color: "#6366f1",
  },
  refunds: {
    label: "Refunds",
    color: "#10b981",
  },
};

interface SpendingOverviewChartProps {
  onExpand?: () => void;
}

const SpendingOverviewChart = ({ onExpand }: SpendingOverviewChartProps) => {
  return (
    <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={onExpand}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Spending Overview
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Monthly spending vs refunds recovered
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span className="text-slate-600 dark:text-slate-400">Spending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-slate-600 dark:text-slate-400">Refunds</span>
              </div>
            </div>
            <Expand className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="h-[350px] w-full flex flex-col">
          <ChartContainer config={chartConfig} className="flex-1 w-full">
            <AreaChart 
              data={data} 
              margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              className="w-full"
              height={300}>
            <defs>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="refundsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'currentColor' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'currentColor' }}
              tickFormatter={(value) => `₹${value / 1000}k`}
              domain={[0, 'dataMax + 5000']}
            />
            <ChartTooltip 
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
              formatter={(value: number, name: string) => [
                `₹${value.toLocaleString()}`,
                name === 'spending' ? 'Spending' : 'Refunds'
              ]}
            />
            <Area
              type="monotone"
              dataKey="spending"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#spendingGradient)"
            />
            <Area
              type="monotone"
              dataKey="refunds"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#refundsGradient)"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpendingOverviewChart;
