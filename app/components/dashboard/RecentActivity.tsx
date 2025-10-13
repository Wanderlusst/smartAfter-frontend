'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  ShoppingCart, 
  RefreshCw, 
  Shield, 
  Bell, 
  ArrowUpRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'purchase' | 'refund' | 'warranty' | 'sync';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'warning' | 'error';
  actionRoute?: string;
}

interface RecentActivityProps {
  activities: Activity[];
  formatCurrency: (amount: number) => string;
  onActivityClick: (activity: Activity) => void;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'purchase':
      return <ShoppingCart className="h-4 w-4" />;
    case 'refund':
      return <RefreshCw className="h-4 w-4" />;
    case 'warranty':
      return <Shield className="h-4 w-4" />;
    case 'sync':
      return <Bell className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
    case 'warning':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    case 'error':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    default:
      return 'bg-muted/10 text-muted-foreground border-muted/20';
  }
};

export default function RecentActivity({
  activities,
  formatCurrency,
  onActivityClick
}: RecentActivityProps) {
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="chart-container"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-fluid-lg font-semibold text-foreground/90">
              Recent Activity
            </CardTitle>
            <p className="text-fluid-sm text-muted-foreground mt-1">
              Latest transactions and updates
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-muted/20"
          >
            <Bell className="h-4 w-4 text-primary" />
          </motion.div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div
                className="glass-enhanced p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
                onClick={() => onActivityClick(activity)}
              >
                <div className="flex items-start gap-3">
                  {/* Activity Icon */}
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="p-2 rounded-lg bg-primary/10 text-primary"
                  >
                    {getActivityIcon(activity.type)}
                  </motion.div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {activity.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {activity.timestamp}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getStatusColor(activity.status)}`}
                          >
                            <div className="flex items-center gap-1">
                              {getStatusIcon(activity.status)}
                              <span className="capitalize">{activity.status}</span>
                            </div>
                          </Badge>
                        </div>
                      </div>

                      {/* Amount */}
                      {activity.amount && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(activity.amount)}
                          </p>
                        </div>
                      )}

                      {/* Action Arrow */}
                      {activity.actionRoute && (
                        <motion.div
                          whileHover={{ x: 2 }}
                          className="p-1 rounded-full bg-muted/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-enhanced p-4 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Total Activities</p>
              <p className="text-fluid-lg font-bold text-foreground">
                {activities.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">This Week</p>
              <p className="text-fluid-lg font-bold text-primary">
                {activities.filter(a => a.status === 'completed').length}
              </p>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </motion.div>
  );
} 