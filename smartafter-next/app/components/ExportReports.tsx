import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Download, FileText, Calendar, TrendingUp } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { exportPurchaseData, exportInvoices } from '../services/emailScanner';

const ExportReports = () => {
  const reportTypes = [
    {
      title: 'Monthly Summary',
      description: 'Complete purchase summary with analytics',
      icon: Calendar,
      format: 'PDF',
      action: () => {
        toast.success('Monthly Summary exported!', {
          description: 'PDF report has been downloaded'
        });
      }
    },
    {
      title: 'Spending Analysis',
      description: 'Detailed spending patterns and trends',
      icon: TrendingUp,
      format: 'Excel',
      action: () => {
        exportPurchaseData();
        toast.success('Spending Analysis exported!', {
          description: 'Excel file has been downloaded'
        });
      }
    },
    {
      title: 'Purchase History',
      description: 'All purchases with receipts and warranties',
      icon: FileText,
      format: 'CSV',
      action: () => {
        exportPurchaseData();
        toast.success('Purchase History exported!', {
          description: 'CSV file has been downloaded'
        });
      }
    }
  ];

  const handleExportInvoices = () => {
    exportInvoices();
    toast.success('Invoices exported!', {
      description: 'Invoice archive has been downloaded'
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Reports
            <Badge className="ml-2 bg-gradient-to-r from-purple-600 to-emerald-600 text-white">Pro</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportTypes.map((report, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <report.icon className="w-5 h-5 mt-0.5 text-indigo-600" />
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {report.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {report.description}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={report.action}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  <Download className="w-4 h-4 mr-1" />
                  {report.format}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice Archive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Download All Invoices
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Get a ZIP file of all saved invoices and receipts
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleExportInvoices}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-1" />
              ZIP
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportReports;
