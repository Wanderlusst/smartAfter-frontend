'use client';

import React, { useState, useEffect } from 'react';
import { useBackgroundData } from '@/app/hooks/useBackgroundData';

interface BackgroundJob {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  totalEmails: number;
  processedEmails: number;
  startTime: number;
  endTime?: number;
  results: any[];
  error?: string;
}

export default function ClientBackgroundProcessor() {
  const [job, setJob] = useState<BackgroundJob | null>(null);
  const { handleBackgroundJobComplete } = useBackgroundData();

  // Real background processing using backend API
  const startBackgroundProcessing = async () => {
    // No longer using localStorage for job tracking - using Supabase for persistence
    
    const jobId = `bg_${Date.now()}`;
    const newJob: BackgroundJob = {
      id: jobId,
      status: 'running',
      progress: 0,
      totalEmails: 0,
      processedEmails: 0,
      startTime: Date.now(),
      results: []
    };
    
    setJob(newJob);
    
    try {
      console.log('🚀 Starting real background processing with backend API...');
      
      // Call the same API that 7-day fetch uses, but for 6 months
      const response = await fetch('/api/dashboard-direct?days=180&maxResults=500&forceRefresh=true&background=true');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Background API response:', data);
      console.log('📊 Background API response structure:', {
        hasData: !!data.data,
        hasPurchases: !!data.data?.purchases,
        purchasesCount: data.data?.purchases?.length || 0,
        summary: data.summary,
        error: data.error
      });
      
      // Update job with real data
      const purchases = data.data?.purchases || [];
      newJob.totalEmails = data.summary?.totalEmails || purchases.length;
      newJob.processedEmails = data.summary?.purchasesFound || purchases.length;
      newJob.progress = 100;
      newJob.status = 'completed';
      newJob.endTime = Date.now();
      
      // Clear global flag
      // No longer using localStorage for job tracking
      
      console.log('📊 Background data structure:', {
        hasData: !!data.data,
        purchasesCount: purchases.length,
        summary: data.summary,
        firstPurchase: purchases[0] || 'No purchases'
      });
      
      // Transform the real data to match our format
      const realResults = purchases.map((purchase: any) => ({
        id: purchase.id || `doc_${purchase.messageId}`,
        messageId: purchase.messageId,
        vendor: purchase.vendor || 'Unknown Vendor',
        amount: purchase.amount || '₹0',
        date: purchase.date || new Date().toISOString(),
        subject: purchase.subject || purchase.emailSubject || 'Document',
        isInvoice: purchase.isInvoice !== undefined ? purchase.isInvoice : true,
        attachmentId: purchase.attachmentId,
        attachmentFilename: purchase.attachmentFilename || purchase.name || 'document.pdf',
        attachmentMimeType: purchase.attachmentMimeType || 'application/pdf',
        attachmentSize: purchase.attachmentSize || 0,
        emailSubject: purchase.emailSubject || purchase.subject,
        emailFrom: purchase.emailFrom || purchase.from,
        emailDate: purchase.emailDate || purchase.date,
        // Backend-enhanced fields
        invoiceNumber: purchase.invoiceNumber,
        documentType: purchase.documentType,
        confidence: purchase.confidence,
        invoiceData: purchase.invoiceData,
        warrantyData: purchase.warrantyData,
        refundData: purchase.refundData,
        rawText: purchase.rawText,
        emailContext: purchase.emailContext
      }));
      
      newJob.results = realResults;
      setJob({ ...newJob });
      
      console.log(`✅ Background processing completed with ${realResults.length} real documents from backend`);
      
      // Handle results - process all results
      if (newJob.results.length > 0) {
        console.log('🎉 Background processing completed with real results:', newJob.results.length);
        
        // Always process results to ensure data is added to store
        handleBackgroundJobComplete(newJob.results);
        newJob.resultsProcessed = true;
        setJob({ ...newJob });
        
        // No longer storing job in localStorage - using Supabase for persistence
      } else {
        console.log('⚠️ No results to process from background job');
      }
      
    } catch (error) {
      console.error('Background processing failed:', error);
      newJob.status = 'failed';
      newJob.error = error instanceof Error ? error.message : 'Unknown error';
      newJob.endTime = Date.now();
      
      // Clear global flag
      // No longer using localStorage for job tracking
      
      setJob({ ...newJob });
    }
  };

  // Auto-start background processing only if no recent job exists
  useEffect(() => {
    const checkAndStartBackground = () => {
      // Check if a job is already running globally
      // No longer checking localStorage for job tracking
      const globalJobFlag = null;
      if (globalJobFlag === 'true') {
        console.log('⏸️ Background job already running globally - skipping');
        return;
      }

      // No longer loading from localStorage
      const storedJob = null;
      if (storedJob) {
        try {
          const parsedJob = JSON.parse(storedJob);
          const now = Date.now();
          const jobAge = now - parsedJob.startTime;
          
          // Only start new job if:
          // 1. No job exists, OR
          // 2. Last job was completed/failed more than 30 minutes ago
          if (parsedJob.status === 'completed' || parsedJob.status === 'failed') {
            if (jobAge > 30 * 60 * 1000) { // 30 minutes
              console.log('🔄 Starting new background job - previous job is old');
              startBackgroundProcessing();
            } else {
              console.log('⏸️ Skipping background job - recent job exists');
            }
          } else if (parsedJob.status === 'running') {
            console.log('⏸️ Skipping background job - job already running');
          }
        } catch (error) {
          console.error('Error parsing stored job:', error);
          startBackgroundProcessing();
        }
      } else {
        console.log('🔄 Starting first background job');
        startBackgroundProcessing();
      }
    };

    const timer = setTimeout(checkAndStartBackground, 5000); // Increased delay to 5 seconds
    
    return () => clearTimeout(timer);
  }, []);

  // No longer storing job in localStorage - using Supabase for persistence

  // No longer loading from localStorage - data is persisted in Supabase
  useEffect(() => {
    // Clean up old localStorage data since we're using Supabase now
    const cleanupOldData = () => {
      try {
        const keysToRemove = ['backgroundJob', 'smartafter-dashboard-cache'];
        keysToRemove.forEach(key => {
          if (localStorage.getItem(key)) {
            console.log(`🧹 Removing old localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to cleanup old localStorage data:', error);
      }
    };
    
    cleanupOldData();
  }, []);

  return null; // This component doesn't render anything
}
