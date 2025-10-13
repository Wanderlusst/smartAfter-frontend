import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Bell, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Badge } from './ui/badge';

const SmartAlerts = () => {
  const alerts = [
    {
      type: 'warning',
      title: 'Return Deadline Soon',
      message: 'Nike Air Force 1 return deadline is in 2 days',
      time: '2 hours ago',
      icon: AlertTriangle,
      color: 'text-orange-500'
    },
    {
      type: 'info',
      title: 'Warranty Expiring',
      message: 'MacBook Pro warranty expires in 30 days',
      time: '1 day ago',
      icon: Clock,
      color: 'text-blue-500'
    },
    {
      type: 'success',
      title: 'Price Drop Alert',
      message: 'iPhone 14 Pro Max is now ₹10,000 cheaper on Amazon',
      time: '3 days ago',
      icon: CheckCircle,
      color: 'text-emerald-500'
    }
  ];

  return (
    <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Smart Alerts
          <Badge className="ml-2 bg-gradient-to-r from-purple-600 to-emerald-600 text-white">Pro</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <alert.icon className={`w-5 h-5 mt-0.5 ${alert.color}`} />
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {alert.title}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {alert.message}
                </p>
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  {alert.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartAlerts;
