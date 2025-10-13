'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Mail, RefreshCw } from 'lucide-react';

interface GmailConnectionPromptProps {
  onConnectionSuccess?: () => void;
}

export function GmailConnectionPrompt({ onConnectionSuccess }: GmailConnectionPromptProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'not-connected' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  // Check Gmail connection status
  const checkGmailStatus = async () => {
    try {
      setConnectionStatus('checking');
      setError(null);
      
      const response = await fetch('/api/dashboard-gmail-data');
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus('connected');
        if (onConnectionSuccess) {
          onConnectionSuccess();
        }
      } else if (result.needsGmailAuth) {
        setConnectionStatus('not-connected');
      } else if (result.needsLogin) {
        setConnectionStatus('not-connected');
        setError('Please log in first');
      } else {
        setConnectionStatus('error');
        setError(result.error || 'Unknown error');
      }
    } catch {
      setConnectionStatus('error');
      setError('Failed to check Gmail connection');
      
    }
  };

  // Check status on component mount
  useEffect(() => {
    checkGmailStatus();
  }, [checkGmailStatus]);

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    try {
      // Redirect to Google OAuth with Gmail scope
      window.location.href = '/api/auth/signin/google';
    } catch {
      setError('Failed to connect to Gmail');
      setIsConnecting(false);
    }
  };

  const handleRefresh = () => {
    checkGmailStatus();
  };

  if (connectionStatus === 'checking') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Checking Gmail connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (connectionStatus === 'connected') {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Gmail Connected Successfully!</span>
          </div>
          <p className="text-sm text-green-600 text-center mt-2">
            Your Gmail account is connected and ready to analyze invoices.
          </p>
          <Button 
            onClick={handleRefresh}
            variant="outline" 
            size="sm" 
            className="w-full mt-4"
          >
            Refresh Status
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="w-5 h-5" />
          <span>Connect Gmail</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        <div className="text-sm text-gray-600 space-y-2">
          <p>To analyze your invoices and purchases, we need to connect to your Gmail account.</p>
          <p>We'll only access:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Emails from the last 7 days</li>
            <li>Purchase confirmations and invoices</li>
            <li>PDF attachments for detailed analysis</li>
          </ul>
        </div>
        
        <Button 
          onClick={handleConnectGmail}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect Gmail Account'
          )}
        </Button>
        
        <Button 
          onClick={handleRefresh}
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          Check Connection Status
        </Button>
      </CardContent>
    </Card>
  );
}

