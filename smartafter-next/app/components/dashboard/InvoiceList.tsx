'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Calendar, Search, Filter, Download, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';

interface Invoice {
  id: string;
  merchant_name: string;
  invoice_number: string | null;
  purchase_date: string;
  total_amount: number;
  currency: string;
  category: string;
  warranty_period: number | null;
  warranty_end_date: string | null;
  status: 'processed' | 'failed' | 'pending';
  source_email_subject: string | null;
  source_email_from: string | null;
  created_at: string;
}

interface InvoiceListProps {
  invoices: Invoice[];
  onDelete?: (invoiceId: string) => void;
  onViewDetails?: (invoice: Invoice) => void;
}

export function InvoiceList({ invoices, onDelete, onViewDetails }: InvoiceListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWarrantyStatus = (warrantyEndDate: string | null) => {
    if (!warrantyEndDate) return null;
    
    const endDate = new Date(warrantyEndDate);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { status: 'expired', days: 0, color: 'destructive' };
    if (daysLeft <= 7) return { status: 'expiring', days: daysLeft, color: 'destructive' };
    if (daysLeft <= 30) return { status: 'expiring', days: daysLeft, color: 'secondary' };
    return { status: 'active', days: daysLeft, color: 'default' };
  };

  // Filter and sort invoices
  const filteredInvoices = invoices
    .filter(invoice => {
      const matchesSearch = invoice.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           invoice.source_email_subject?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || invoice.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime();
          break;
        case 'amount':
          comparison = a.total_amount - b.total_amount;
          break;
        case 'merchant':
          comparison = a.merchant_name.localeCompare(b.merchant_name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const categories = Array.from(new Set(invoices.map(inv => inv.category)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Invoice History</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-');
            setSortBy(field);
            setSortOrder(order as 'asc' | 'desc');
          }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest)</SelectItem>
              <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
              <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
              <SelectItem value="merchant-asc">Merchant (A-Z)</SelectItem>
              <SelectItem value="merchant-desc">Merchant (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invoice List */}
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found matching your criteria.
            </div>
          ) : (
            filteredInvoices.map((invoice) => {
              const warrantyStatus = getWarrantyStatus(invoice.warranty_end_date);
              
              return (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="font-medium truncate">{invoice.merchant_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {invoice.invoice_number && `Invoice #${invoice.invoice_number} • `}
                          {formatDate(invoice.purchase_date)}
                        </p>
                      </div>
                      <Badge variant="outline">{invoice.category}</Badge>
                      <Badge 
                        variant={invoice.status === 'processed' ? 'default' : 
                                invoice.status === 'failed' ? 'destructive' : 'secondary'}
                      >
                        {invoice.status}
                      </Badge>
                      {warrantyStatus && (
                        <Badge variant={warrantyStatus.color as any}>
                          {warrantyStatus.status === 'expired' ? 'Expired' :
                           warrantyStatus.status === 'expiring' ? `${warrantyStatus.days} days left` :
                           'Active'}
                        </Badge>
                      )}
                    </div>
                    {invoice.source_email_subject && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        From: {invoice.source_email_subject}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                      {warrantyStatus && warrantyStatus.status !== 'expired' && (
                        <p className="text-xs text-muted-foreground">
                          Warranty: {formatDate(invoice.warranty_end_date!)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex space-x-1">
                      {onViewDetails && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Invoice Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Merchant</label>
                                  <p className="text-sm text-muted-foreground">{invoice.merchant_name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Amount</label>
                                  <p className="text-sm text-muted-foreground">{formatCurrency(invoice.total_amount)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Purchase Date</label>
                                  <p className="text-sm text-muted-foreground">{formatDate(invoice.purchase_date)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Category</label>
                                  <p className="text-sm text-muted-foreground">{invoice.category}</p>
                                </div>
                                {invoice.invoice_number && (
                                  <div>
                                    <label className="text-sm font-medium">Invoice Number</label>
                                    <p className="text-sm text-muted-foreground">{invoice.invoice_number}</p>
                                  </div>
                                )}
                                {invoice.warranty_end_date && (
                                  <div>
                                    <label className="text-sm font-medium">Warranty End Date</label>
                                    <p className="text-sm text-muted-foreground">{formatDate(invoice.warranty_end_date)}</p>
                                  </div>
                                )}
                              </div>
                              {invoice.source_email_subject && (
                                <div>
                                  <label className="text-sm font-medium">Source Email</label>
                                  <p className="text-sm text-muted-foreground">{invoice.source_email_subject}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {onDelete && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onDelete(invoice.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination could be added here */}
        {filteredInvoices.length > 0 && (
          <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
            <p>Showing {filteredInvoices.length} of {invoices.length} invoices</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
