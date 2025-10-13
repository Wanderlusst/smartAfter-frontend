'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { InvoiceStats } from '@/app/components/dashboard/InvoiceStats';
import { SpendingChart } from '@/app/components/dashboard/SpendingChart';
import { InvoiceList } from '@/app/components/dashboard/InvoiceList';
import { 
  RefreshCw, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/app/hooks/use-toast';

interface ProcessingResult {
  success: boolean;
  processed: number;
  failed: number;
  skipped: number;
  errors: string[];
  processingTime: number;
}

interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  averageAmount: number;
  categories: { [key: string]: number };
  monthlySpending: { [key: string]: number };
  activeWarranties: number;
  expiringWarranties: number;
}

interface WarrantyAlert {
  id: string;
  merchant_name: string;
  purchase_date: string;
  warranty_end_date: string;
  days_remaining: number;
  total_amount: number;
  category: string;
}

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

export default function InvoicesPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [warrantyAlerts, setWarrantyAlerts] = useState<WarrantyAlert[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats and warranty alerts
      const statsResponse = await fetch('/api/invoices/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
        setWarrantyAlerts(statsData.warrantyAlerts);
      }

      // Load recent invoices
      const invoicesResponse = await fetch('/api/invoices?limit=50');
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        setInvoices(invoicesData.invoices);
      }

    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to load invoice data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processInvoices = async (days: number = 30) => {
    try {
      setIsProcessing(true);
      setProcessingResult(null);

      const response = await fetch('/api/invoices/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days,
          maxResults: 100,
          skipExisting: true,
          storeRawPdf: true,
          retryFailed: false
        }),
      });

      const result = await response.json();

      if (result.success) {
        setProcessingResult(result.result);
        toast({
          title: "Processing Complete",
          description: `Processed ${result.result.processed} invoices successfully`,
        });
        
        // Reload data to show updated results
        await loadData();
      } else {
        throw new Error(result.error || 'Processing failed');
      }

    } catch (error: any) {
      
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process invoices",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch('/api/invoices', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Invoice Deleted",
          description: "Invoice has been removed successfully",
        });
        
        // Reload data
        await loadData();
      } else {
        throw new Error(result.error || 'Delete failed');
      }

    } catch (error: any) {
      
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading invoice data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Management</h1>
          <p className="text-muted-foreground">
            Process and manage invoices from your Gmail account
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => processInvoices(7)}
            disabled={isProcessing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
            Sync Last 7 Days
          </Button>
          <Button
            onClick={() => processInvoices(30)}
            disabled={isProcessing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
            Sync Last 30 Days
          </Button>
        </div>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              <div className="flex-1">
                <p className="font-medium">Processing invoices from Gmail...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few minutes depending on the number of emails
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Results */}
      {processingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {processingResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              Processing Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{processingResult.processed}</div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{processingResult.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{processingResult.skipped}</div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatProcessingTime(processingResult.processingTime)}
                </div>
                <div className="text-sm text-muted-foreground">Processing Time</div>
              </div>
            </div>
            
            {processingResult.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Errors encountered:</p>
                    {processingResult.errors.slice(0, 3).map((error, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        {error}
                      </p>
                    ))}
                    {processingResult.errors.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {processingResult.errors.length - 3} more errors
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <InvoiceStats stats={stats} warrantyAlerts={warrantyAlerts} />
      )}

      {/* Charts */}
      {stats && (
        <SpendingChart 
          monthlySpending={stats.monthlySpending} 
          categories={stats.categories} 
        />
      )}

      {/* Invoice List */}
      <InvoiceList 
        invoices={invoices}
        onDelete={deleteInvoice}
      />
    </div>
  );
}
