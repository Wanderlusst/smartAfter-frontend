"use client";

import React, { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { forceClearSession } from '../lib/utils';

const Landing = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [isClearingSession, setIsClearingSession] = useState(false);

  // Only clear session if explicitly requested via URL parameter
  useEffect(() => {
    const clearSessionIfNeeded = async () => {
      // Only clear session if there's an explicit clear request
      const shouldClear = new URLSearchParams(window.location.search).get('clear') === 'true';
      
      if (shouldClear && (status === 'authenticated' || (session && Object.keys(session).length > 0))) {
        console.log('🧹 Clearing session as requested');
        setIsClearingSession(true);
        
        try {
          // First try NextAuth signOut
          await signOut({ 
            callbackUrl: '/landing',
            redirect: false 
          });
          
          // Then force clear all stored data
          forceClearSession();
          
        } catch (error) {
          console.error('Error clearing session:', error);
          // Fallback: force clear anyway
          forceClearSession();
        } finally {
          setIsClearingSession(false);
        }
      }
    };

    // Run immediately and also when status changes
    clearSessionIfNeeded();
  }, [session, status]);

  // Additional cleanup effect that runs immediately on mount
  useEffect(() => {
    // Only clear data if explicitly requested via URL parameter
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const shouldClear = urlParams.get('clear') === 'true';
      
      if (shouldClear) {
        console.log('🧹 Clearing all stored data as requested');
        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear specific NextAuth keys
        localStorage.removeItem('next-auth.session-token');
        localStorage.removeItem('next-auth.csrf-token');
        localStorage.removeItem('next-auth.callback-url');
      }
    }
  }, []); // Empty dependency array = runs once on mount

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      console.log('🔐 Starting Google OAuth authentication...');
      
      // Get callback URL from query params
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl') || '/dashboard';
      
      // Force fresh authentication with proper scopes
      const result = await signIn('google', { 
        callbackUrl: callbackUrl,
        redirect: false
      });

      console.log('🔐 Authentication result:', result);

      if (result?.error) {
        console.error('❌ Authentication error:', result.error);
        setError(`Authentication failed: ${result.error}`);
        
      } else if (result?.ok) {
        console.log('✅ Authentication successful, redirecting to:', callbackUrl);
        router.push(callbackUrl);
      } else {
        console.log('⚠️ Authentication result unclear:', result);
        setError('Authentication response unclear. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ Authentication exception:', error);
      setError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Show loading only while clearing session or if status is loading
  if (isClearingSession || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-emerald-50/30 dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-800/80 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            {isClearingSession ? 'Clearing session...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Handle redirect to dashboard when authenticated
  useEffect(() => {
    if (session && status === 'authenticated') {
      // Get callback URL from query params
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl') || '/dashboard';
      
      console.log('🔄 Redirecting authenticated user to:', callbackUrl);
      
      // Add a small delay to prevent race conditions
      const redirectTimer = setTimeout(() => {
        router.push(callbackUrl);
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [session, status, router]);

  // If user is already authenticated, show loading while redirecting
  if (session && status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-emerald-50/30 dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-800/80 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-emerald-50/30 dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-800/80">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Meet <span className="bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">SmartAfter</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            Your intelligent after-purchase assistant that automatically organizes receipts, 
            tracks returns, and keeps your warranties safe.
          </p>
          
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 p-8 max-w-md mx-auto mb-12">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Get Started</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Connect your Gmail to begin organizing your purchases</p>
            </div>
            
            {error && (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-4">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}
            
            <button
              onClick={handleConnectGmail}
              disabled={isConnecting}
              className={`w-full bg-gradient-to-r from-purple-600 to-emerald-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg transform ${
                isConnecting 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:from-purple-700 hover:to-emerald-700 hover:shadow-xl hover:scale-[1.02]'
              } mb-4`}
            >
              {isConnecting ? '🔄 Connecting...' : '🔗 Connect Gmail'}
            </button>
            
            <div className="bg-gradient-to-r from-purple-50 to-emerald-50 dark:from-purple-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-purple-100/50 dark:border-purple-800/50">
              <div className="flex items-start gap-3 text-sm">
                <span className="text-lg">🛡️</span>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Privacy First</p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                    We only read emails with receipts. You stay in control. 
                    No tracking, no ads, no spam — ever.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">📧</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Auto-Organize</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Automatically detects and categorizes purchase receipts from your email</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">⏰</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Alerts</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Never miss a return deadline or warranty expiration again</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">📊</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Insights</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Track spending patterns and optimize your purchase decisions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing; 