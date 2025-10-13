'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Package,
  Percent
} from 'lucide-react';

interface RefundOpportunity {
  id: string;
  title: string;
  description: string;
  potentialAmount: number;
  probability: number;
  deadline: string;
  category: string;
  items: number;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  actionRoute: string;
}

interface RefundOpportunityCardProps {
  opportunities: RefundOpportunity[];
  totalPotential: number;
  formatCurrency: (amount: number) => string;
  onOpportunityClick: (opportunity: RefundOpportunity) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
    case 'in_progress':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'completed':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'expired':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    default:
      return 'bg-muted/10 text-muted-foreground border-muted/20';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'in_progress':
      return <TrendingUp className="h-4 w-4" />;
    case 'completed':
      return <DollarSign className="h-4 w-4" />;
    case 'expired':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export default function RefundOpportunityCard({
  opportunities,
  totalPotential,
  formatCurrency,
  onOpportunityClick
}: RefundOpportunityCardProps) {
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0
    }
  };

  const daysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 3) return 'text-red-500';
    if (days <= 7) return 'text-orange-500';
    if (days <= 14) return 'text-yellow-500';
    return 'text-green-500';
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
              Refund Opportunities
            </CardTitle>
            <p className="text-fluid-sm text-muted-foreground mt-1">
              Potential savings available
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 text-green-600"
          >
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {formatCurrency(totalPotential)}
            </span>
          </motion.div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-enhanced p-4 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Total Potential</span>
            </div>
            <p className="text-fluid-lg font-bold text-foreground">
              {formatCurrency(totalPotential)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-enhanced p-4 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Opportunities</span>
            </div>
            <p className="text-fluid-lg font-bold text-foreground">
              {opportunities.length}
            </p>
          </motion.div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Active Opportunities</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {opportunities.map((opportunity, index) => {
              const daysLeft = daysUntilDeadline(opportunity.deadline);
              const urgencyColor = getUrgencyColor(daysLeft);
              
              return (
                <motion.div
                  key={opportunity.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="group relative"
                >
                  <div
                    className="glass-enhanced p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
                    onClick={() => onOpportunityClick(opportunity)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {opportunity.title}
                          </h5>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getStatusColor(opportunity.status)}`}
                          >
                            <div className="flex items-center gap-1">
                              {getStatusIcon(opportunity.status)}
                              <span className="capitalize">{opportunity.status.replace('_', ' ')}</span>
                            </div>
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {opportunity.description}
                        </p>

                        <div className="space-y-2">
                          {/* Probability Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Success Probability</span>
                              <span className="font-medium text-foreground">{opportunity.probability}%</span>
                            </div>
                            <Progress 
                              value={opportunity.probability} 
                              className="h-2"
                            />
                          </div>

                          {/* Details */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{opportunity.items} items</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className={`h-3 w-3 ${urgencyColor}`} />
                                <span className={urgencyColor}>
                                  {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">
                                {formatCurrency(opportunity.potentialAmount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Arrow */}
                      <motion.div
                        whileHover={{ x: 2 }}
                        className="p-1 rounded-full bg-muted/20 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button 
            className="w-full glass-button"
            onClick={() => onOpportunityClick(opportunities[0])}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Process All Refunds
          </Button>
        </motion.div>
      </CardContent>
    </motion.div>
  );
} 