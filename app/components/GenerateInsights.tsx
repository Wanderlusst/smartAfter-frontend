import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, DollarSign, Calendar, ShoppingBag } from 'lucide-react';
import { Badge } from './ui/badge';

const GenerateInsights = () => {
  const insights = [
    {
      title: 'Monthly Spending Trend',
      value: '+12%',
      description: 'Spending increased compared to last month',
      icon: TrendingUp,
      color: 'text-emerald-600'
    },
    {
      title: 'Average Purchase',
      value: '₹2,847',
      description: 'Your typical purchase amount',
      icon: DollarSign,
      color: 'text-blue-600'
    },
    {
      title: 'Most Active Day',
      value: 'Saturday',
      description: 'You shop most on weekends',
      icon: Calendar,
      color: 'text-purple-600'
    },
    {
      title: 'Top Category',
      value: 'Electronics',
      description: '45% of your purchases',
      icon: ShoppingBag,
      color: 'text-orange-600'
    }
  ];

  return (
    <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Advanced Insights
          <Badge className="ml-2 bg-gradient-to-r from-purple-600 to-emerald-600 text-white">Pro</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <insight.icon className={`w-5 h-5 ${insight.color}`} />
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                  {insight.title}
                </h4>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                {insight.value}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GenerateInsights;
