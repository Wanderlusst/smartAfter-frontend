'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Upload, 
  FileText, 
  Loader2, 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle,
  Download,
  Eye,
  Trash2,
  Image as ImageIcon,
  FileImage,
  FileText as FilePdf
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface ExtractedData {
  totalAmount?: string;
  vendor?: string;
  date?: string;
  items?: string[];
  rawText: string;
  confidence?: number;
}

interface InvoiceFile {
  id: string;
  file: File;
  preview: string;
  extractedData?: ExtractedData;
  isProcessing: boolean;
  error?: string;
}

const InvoiceOCR = () => {
  const [files, setFiles] = useState<InvoiceFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Generate unique ID for files
  const generateId = () => `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList) => {
    const newFiles: InvoiceFile[] = Array.from(selectedFiles).map(file => ({
      id: generateId(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      isProcessing: false
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    // Process each file
    newFiles.forEach(processFile);
  }, []);

  // Process individual file with OCR
  const processFile = async (fileData: InvoiceFile) => {
    const { file } = fileData;
    
    // Update file status
    setFiles(prev => prev.map(f => 
      f.id === fileData.id ? { ...f, isProcessing: true, error: undefined } : f
    ));

    try {
      // TODO: Replace this with actual OCR API call
      // const extractedText = await callOCRService(file);
      
      // Extract text from file (this is where you'd call your OCR service)
      const extractedText = await extractTextFromFile(file);
      
      // Parse extracted text
      const extractedData = parseInvoiceData(extractedText);
      
      // Update file with extracted data
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { 
          ...f, 
          extractedData, 
          isProcessing: false 
        } : f
      ));

      toast({
        title: "Invoice Processed Successfully",
        description: `Extracted data from ${file.name}`,
      });

    } catch (error) {
      
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { 
          ...f, 
          isProcessing: false, 
          error: error instanceof Error ? error.message : 'Failed to process file' 
        } : f
      ));
      
      toast({
        title: "Processing Failed",
        description: `Could not process ${file.name}`,
        variant: "destructive"
      });
    }
  };

  // Extract text from file (placeholder for OCR service)
  const extractTextFromFile = async (file: File): Promise<string> => {
    // TODO: Integrate with real OCR service like:
    // - Google Cloud Vision API
    // - AWS Textract
    // - Azure Computer Vision
    // - Tesseract.js (client-side)
    // - Your custom OCR service
    
    // This is where you'd call your OCR service
    // For now, return a sample text based on file type
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (file.type === 'application/pdf') {
      return `INVOICE
      
Company: Sample Store
Date: ${new Date().toLocaleDateString()}
Invoice #: INV-${Date.now()}

Items:
- Product 1: ₹500
- Product 2: ₹300
- Service Fee: ₹100

Subtotal: ₹900
Tax: ₹90
Total: ₹990`;
    } else if (file.type.startsWith('image/')) {
      return `RECEIPT
      
Store: Sample Store
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

Items:
- Coffee: ₹50
- Sandwich: ₹150
- Tax: ₹20

Total: ₹220`;
    } else {
      throw new Error('Unsupported file type');
    }
  };

  // Parse extracted text into structured data
  const parseInvoiceData = (text: string): ExtractedData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract total amount
    const totalPattern = /(?:total|amount|sum|grand total).*?[₹$]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;
    const totalMatch = text.match(totalPattern);
    const totalAmount = totalMatch ? totalMatch[1] : undefined;

    // Extract date
    const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/i;
    const dateMatch = text.match(datePattern);
    const date = dateMatch ? dateMatch[0] : undefined;

    // Extract vendor/store name
    const vendor = lines.slice(0, 5).find(line => 
      line.length > 3 && 
      !line.match(/^\d+$/) && 
      !line.match(/invoice|receipt|bill|date|total|amount/i) &&
      line.match(/[a-zA-Z]/)
    );

    // Extract items
    const items = lines.filter(line => 
      line.length > 5 && 
      !line.match(/^(total|subtotal|tax|amount|date|invoice|receipt|store|company)/i) &&
      line.match(/[a-zA-Z]/) &&
      line.includes('₹')
    ).slice(0, 5);

    return {
      totalAmount,
      vendor,
      date,
      items,
      rawText: text,
      confidence: 0.85
    };
  };

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files);
    }
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  // Add to purchases
  const addToPurchases = (fileData: InvoiceFile) => {
    if (!fileData.extractedData) return;

    // Here you would add to your purchase store
    
    toast({
      title: "Added to Purchases",
      description: `Invoice from ${fileData.extractedData.vendor || 'Unknown vendor'} has been added.`,
    });
  };

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FilePdf className="w-8 h-8 text-red-500" />;
    }
    return <FileImage className="w-8 h-8 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Invoice & Receipt Scanner
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload invoices and receipts to automatically extract purchase information
        </p>
      </div>

      {/* Upload Area */}
      <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
        <CardContent className="p-8">
          <div
            className={`text-center transition-all duration-200 ${
              dragActive ? 'scale-105' : 'scale-100'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Drop files here or click to upload
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Supports JPG, PNG, PDF files up to 10MB
                </p>
              </div>
              
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Choose Files
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      <AnimatePresence>
        {files.map((fileData, index) => (
          <motion.div
            key={fileData.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(fileData.file)}
                    <div>
                      <CardTitle className="text-base">{fileData.file.name}</CardTitle>
                      <p className="text-sm text-gray-500">
                        {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {fileData.isProcessing && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing
                      </Badge>
                    )}
                    {fileData.extractedData && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Processed
                      </Badge>
                    )}
                    {fileData.error && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Error
                      </Badge>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileData.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Preview */}
                {fileData.preview && (
                  <div className="relative">
                    <img 
                      src={fileData.preview} 
                      alt="Preview" 
                      className="max-w-full max-h-48 mx-auto rounded-lg border"
                    />
                  </div>
                )}
                
                {/* Processing Status */}
                {fileData.isProcessing && (
                  <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-blue-700 dark:text-blue-300 font-medium">
                      Processing with OCR...
                    </span>
                  </div>
                )}
                
                {/* Error State */}
                {fileData.error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-700 dark:text-red-300">
                      {fileData.error}
                    </span>
                  </div>
                )}
                
                {/* Extracted Data */}
                {fileData.extractedData && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Extracted Information
                      </h4>
                      <Badge variant="outline">
                        {Math.round((fileData.extractedData.confidence || 0) * 100)}% confidence
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fileData.extractedData.vendor && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Vendor</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {fileData.extractedData.vendor}
                          </p>
                        </div>
                      )}
                      
                      {fileData.extractedData.totalAmount && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Amount</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ₹{fileData.extractedData.totalAmount}
                          </p>
                        </div>
                      )}
                      
                      {fileData.extractedData.date && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {fileData.extractedData.date}
                          </p>
                        </div>
                      )}
                    </div>

                    {fileData.extractedData.items && fileData.extractedData.items.length > 0 && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Items</Label>
                        <ul className="text-sm text-gray-900 dark:text-gray-100 mt-1 space-y-1">
                          {fileData.extractedData.items.map((item, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button 
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => addToPurchases(fileData)}
                      >
                        Add to Purchases
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Raw Text
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Empty State */}
      {files.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No files uploaded yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Upload your first invoice or receipt to get started
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default InvoiceOCR;
