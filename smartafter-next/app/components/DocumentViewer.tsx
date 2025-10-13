'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  FileText, 
  Download, 
  Eye, 
  X, 
  Calendar, 
  User, 
  Mail, 
  DollarSign,
  Tag,
  Clock
} from 'lucide-react';

interface Document {
  id: string | number;
  name?: string;
  title?: string;
  type: string;
  amount: string;
  date: string;
  vendor?: string;
  category: string;
  size?: string;
  mimeType?: string;
  emailSubject?: string;
  emailFrom?: string;
  emailDate?: string;
  messageId?: string;
  attachmentId?: string;
  status?: string;
  daysLeft?: number;
  reason?: string;
}

interface DocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentViewer({ document, isOpen, onClose }: DocumentViewerProps) {
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (document && isOpen) {
      generateDocumentContent();
    }
  }, [document, isOpen]);

  const generateDocumentContent = () => {
    if (!document) return;

    setIsLoading(true);
    
    // Simulate document content generation
    setTimeout(() => {
      const content = `
        ${(document.vendor || 'Unknown Vendor').toUpperCase()}
        
        ${document.title || 'Document'}
        
        Date: ${new Date(document.date).toLocaleDateString()}
        Amount: ${document.amount}
        Type: ${document.type.toUpperCase()}
        Category: ${document.category}
        
        INVOICE DETAILS:
        - Vendor: ${document.vendor || 'Unknown Vendor'}
        - Document ID: ${document.id}
        - Email Subject: ${document.emailSubject || 'No subject'}
        - Email From: ${document.emailFrom || 'Unknown sender'}
        - Email Date: ${document.emailDate || document.date}
        
        This is a sample document content for ${document.name || 'document'}.
        The actual document would contain the real invoice or receipt details.
        
        Thank you for your business!
      `;
      
      setDocumentContent(content);
      setIsLoading(false);
    }, 1000);
  };

  const handleDownload = () => {
    if (!document) return;

    // Create a blob with the document content
    const blob = new Blob([documentContent], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.name || 'document.pdf';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'invoice':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'receipt':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'warranty':
        return <FileText className="h-4 w-4 text-orange-600" />;
      case 'refund':
        return <FileText className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'invoice':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'receipt':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warranty':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'refund':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getTypeIcon(document.type)}
              <DialogTitle className="text-xl font-semibold">
                {document.title}
              </DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className={getTypeColor(document.type)}>
                    {document.type.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {document.category}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {document.amount}
                  </div>
                  <div className="text-sm text-gray-500">
                    Amount
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">Date</div>
                    <div className="text-sm text-gray-500">
                      {new Date(document.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">Vendor</div>
                    <div className="text-sm text-gray-500">{document.vendor}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">Email</div>
                    <div className="text-sm text-gray-500">{document.emailFrom}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">Size</div>
                    <div className="text-sm text-gray-500">{document.size}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Document Content</CardTitle>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading document content...</span>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200">
                    {documentContent}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Details */}
          <Card>
            <CardHeader>
              <CardTitle>Email Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{document.emailSubject}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">From</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{document.emailFrom}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</div>
                                     <div className="text-sm text-gray-600 dark:text-gray-400">
                     {new Date(document.emailDate || document.date).toLocaleString()}
                   </div>
                </div>
                {document.messageId && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Message ID</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">{document.messageId}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 