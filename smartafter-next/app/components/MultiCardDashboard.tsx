'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';

interface CardData {
  cardIndex: number;
  bank: string;
  cardNumber: string;
  cardholderName: string;
  statementPeriod: string;
  totalSpent: number;
  totalCredits: number;
  totalDue: number;
  minimumDue: number;
  dueDate: string;
  creditLimit: number;
  availableCredit: number;
  availableCash: number;
  transactionCount: number;
  transactions: any[];
  categoryBreakdown: any[];
  spendingInsights: string[];
  paymentInsights: string[];
}

interface MultiCardData {
  totalCards: number;
  totalSpent: number;
  totalCredits: number;
  totalDue: number;
  totalMinimumDue: number;
  cards: CardData[];
  combinedTransactions: any[];
  categoryBreakdown: any;
  spendingInsights: string[];
  paymentInsights: string[];
}

interface MultiCardDashboardProps {
  data: MultiCardData;
  onAddCard?: () => void;
  onViewCard?: (cardIndex: number) => void;
}

export default function MultiCardDashboard({ data, onAddCard, onViewCard }: MultiCardDashboardProps) {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getCardColor = (bank: string) => {
    const colors: { [key: string]: string } = {
      'HDFC': 'bg-blue-500',
      'ICICI': 'bg-purple-500',
      'Axis': 'bg-red-500',
      'SBI': 'bg-green-500',
      'Kotak': 'bg-orange-500',
      'Generic': 'bg-gray-500'
    };
    return colors[bank] || 'bg-gray-500';
  };

  const getDueDateStatus = (dueDate: string) => {
    if (!dueDate) return 'unknown';
    const due = new Date(dueDate);
    const today = new Date();
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'urgent';
    if (diffDays <= 7) return 'warning';
    return 'normal';
  };

  const getDueDateBadge = (dueDate: string) => {
    const status = getDueDateStatus(dueDate);
    const badges = {
      overdue: { color: 'bg-red-500', text: 'Overdue' },
      urgent: { color: 'bg-orange-500', text: 'Due Soon' },
      warning: { color: 'bg-yellow-500', text: 'Due This Week' },
      normal: { color: 'bg-green-500', text: 'On Time' },
      unknown: { color: 'bg-gray-500', text: 'Unknown' }
    };
    
    const badge = badges[status];
    return (
      <Badge className={`${badge.color} text-white`}>
        {badge.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Multi-Card Dashboard</h1>
          <p className="text-gray-600">Manage all your credit cards in one place</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSensitiveData(!showSensitiveData)}
            className="flex items-center gap-2"
          >
            {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showSensitiveData ? 'Hide' : 'Show'} Sensitive Data
          </Button>
          {onAddCard && (
            <Button onClick={onAddCard} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Card
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCards}</div>
            <p className="text-xs text-muted-foreground">Active credit cards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(data.totalSpent)}</div>
            <p className="text-xs text-muted-foreground">Across all cards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(data.totalDue)}</div>
            <p className="text-xs text-muted-foreground">Amount to pay</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.combinedTransactions.length}</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards">Cards Overview</TabsTrigger>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.cards.map((card) => (
              <Card 
                key={card.cardIndex} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedCard === card.cardIndex ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedCard(selectedCard === card.cardIndex ? null : card.cardIndex)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getCardColor(card.bank)}`}></div>
                      <CardTitle className="text-lg">{card.bank}</CardTitle>
                    </div>
                    {getDueDateBadge(card.dueDate)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {showSensitiveData ? card.cardNumber : '**** **** **** ' + card.cardNumber.slice(-4)}
                  </div>
                  <div className="text-sm font-medium">{card.cardholderName}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Spent</div>
                      <div className="font-semibold text-red-600">{formatCurrency(card.totalSpent)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Due</div>
                      <div className="font-semibold text-orange-600">{formatCurrency(card.totalDue)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Min Due</div>
                      <div className="font-semibold">{formatCurrency(card.minimumDue)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Transactions</div>
                      <div className="font-semibold">{card.transactionCount}</div>
                    </div>
                  </div>
                  
                  {card.dueDate && (
                    <div className="text-sm">
                      <div className="text-gray-500">Due Date</div>
                      <div className="font-semibold">{formatDate(card.dueDate)}</div>
                    </div>
                  )}

                  {onViewCard && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewCard(card.cardIndex);
                      }}
                    >
                      View Details
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.combinedTransactions.map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${getCardColor(transaction.bank || 'Generic')}`}></div>
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-gray-500">
                          {transaction.date} • {transaction.category}
                        </div>
                      </div>
                    </div>
                    <div className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Spending Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.spendingInsights.map((insight, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.paymentInsights.map((insight, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
