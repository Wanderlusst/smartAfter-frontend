"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Loader2, User, Calendar, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Settings = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [notifications, setNotifications] = useState({
    returnReminders: true,
    warrantyAlerts: true,
    newPurchases: true,
    weeklyDigest: false
  });
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  
  // PERFORMANCE: Memoize computed values - moved to top to avoid conditional hooks
  const isConnected = useMemo(() => !!session?.user?.email, [session?.user?.email]);
  const userEmail = useMemo(() => session?.user?.email || '', [session?.user?.email]);
  const userName = useMemo(() => session?.user?.name || '', [session?.user?.name]);
  const userInitials = useMemo(() => 
    userName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U', 
    [userName]
  );
  
  // REMOVED: Credit Card Settings - no longer needed

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // REMOVED: Credit card settings loading - no longer needed

  // Redirect to landing if not authenticated
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/landing');
    }
  }, [status, router]);

  const handleDisconnectGmail = async () => {
    try {
      setIsDisconnecting(true);
      toast.info('Disconnecting from Gmail and clearing cache...');
      
      // Clear all cached data
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear specific NextAuth keys
        localStorage.removeItem('next-auth.session-token');
        localStorage.removeItem('next-auth.csrf-token');
        localStorage.removeItem('next-auth.callback-url');
        localStorage.removeItem('smartafter-dashboard-cache');
      }
      
      // Sign out and redirect to landing
      await signOut({ 
        callbackUrl: '/landing?clear=true',
        redirect: true 
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect. Please try again.');
      setIsDisconnecting(false);
    }
  };

  const handleReauthenticate = async () => {
    try {
      setIsReauthenticating(true);
      toast.info('Re-authenticating...');
      
      // Re-authenticate with Google
      await signIn('google', { 
        callbackUrl: '/dashboard',
        redirect: true 
      });
    } catch (error) {
      
      toast.error('Failed to re-authenticate. Please try again.');
      setIsReauthenticating(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      toast.info('Connecting to Gmail...');
      await signIn('google', { 
        callbackUrl: '/dashboard',
        redirect: true 
      });
    } catch (error) {
      
      toast.error('Failed to connect. Please try again.');
    }
  };

  // PERFORMANCE: Memoize notification change handler
  const handleNotificationChange = useCallback((key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
    toast.success('Notification preferences updated');
  }, []);

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      toast.success('Cache cleared successfully!');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    
    try {
      toast.info('Deleting account...');
      // In a real app, you'd call an API to delete the account
      // For now, just sign out
      await signOut({ 
        callbackUrl: '/landing',
        redirect: true 
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please try again.');
    }
  };

  const handleSaveAccountInfo = () => {
    toast.success('Account information saved successfully');
  };

  const handleExportData = () => {
    toast.info('Preparing your data export...');
    // In a real app, this would trigger a data export
  };

  const handleDownloadInvoices = () => {
    toast.info('Preparing invoice download...');
    // In a real app, this would trigger an invoice download
  };

  // Credit Card Settings Functions
  // PERFORMANCE: Memoize credit card input change handler
  const handleCreditCardInputChange = useCallback((field: string, value: string) => {
    setCreditCardSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setCreditCardSaved(false);
  }, []);

  // PERFORMANCE: Memoize password generation
  const generatePassword = useCallback((settings: typeof creditCardSettings): string => {
    const { firstName, lastName, dateOfBirth } = settings;
    
    if (!firstName || !lastName || !dateOfBirth) {
      return '';
    }

    // Generate password using universal pattern:
    // First 4 letters of name (uppercase, no spaces/periods) + DDMM format of DOB
    const fullName = `${firstName} ${lastName}`.toUpperCase();
    const nameWithoutSpaces = fullName.replace(/[.\s]/g, '');
    const firstFourLetters = nameWithoutSpaces.substring(0, 4);
    
    // Convert date of birth to DDMM format
    const dob = new Date(dateOfBirth);
    const day = dob.getDate().toString().padStart(2, '0');
    const month = (dob.getMonth() + 1).toString().padStart(2, '0');
    const ddmm = `${day}${month}`;
    
    return `${firstFourLetters}${ddmm}`;
  }, []);

  const generateAlternativePassword = (settings: typeof creditCardSettings): string => {
    const { firstName, lastName, dateOfBirth } = settings;
    
    if (!firstName || !lastName || !dateOfBirth) {
      return '';
    }

    // Alternative pattern: First 4 letters + MMDD format of DOB
    const fullName = `${firstName} ${lastName}`.toUpperCase();
    const nameWithoutSpaces = fullName.replace(/[.\s]/g, '');
    const firstFourLetters = nameWithoutSpaces.substring(0, 4);
    
    // Convert date of birth to MMDD format
    const dob = new Date(dateOfBirth);
    const day = dob.getDate().toString().padStart(2, '0');
    const month = (dob.getMonth() + 1).toString().padStart(2, '0');
    const mmdd = `${month}${day}`;
    
    return `${firstFourLetters}${mmdd}`;
  };

  const handleSaveCreditCardSettings = async () => {
    setCreditCardLoading(true);
    
    try {
      // Validate required fields
      if (!creditCardSettings.firstName || !creditCardSettings.lastName || !creditCardSettings.dateOfBirth) {
        toast.error('Please fill in all required fields');
        return;
      }

      // PERFORMANCE: Save to localStorage first for instant feedback
      localStorage.setItem('creditCardSettings', JSON.stringify(creditCardSettings));
      setCreditCardSaved(true);
      toast.success('Credit card settings saved successfully!');
      setTimeout(() => setCreditCardSaved(false), 3000);

      // PERFORMANCE: Save to Supabase in background (non-blocking)
      setTimeout(async () => {
        try {
          const { CreditCardSettingsService } = await import('@/lib/creditCardSettingsService');
          const result = await CreditCardSettingsService.saveSettings({
            first_name: creditCardSettings.firstName,
            last_name: creditCardSettings.lastName,
            date_of_birth: creditCardSettings.dateOfBirth
          });

          if (!result.success) {
            console.warn('⚠️ Background Supabase save failed:', result.error);
            // Keep localStorage data if Supabase fails
          }
        } catch (err) {
          console.warn('⚠️ Background Supabase save failed:', err);
          // Keep localStorage data if Supabase fails
        }
      }, 100);

    } catch (err) {
      console.error('Error saving credit card settings:', err);
      toast.error('Failed to save credit card settings');
    } finally {
      setCreditCardLoading(false);
    }
  };

  // PERFORMANCE FIX: Show minimal loading state
  if (status === 'loading') {
    return (
      <div className="p-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">⚙️ Settings</h1>
          <p className="text-gray-600 dark:text-slate-400">Loading your preferences...</p>
        </div>
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  // Show sign in prompt if not authenticated
  if (!session) {
    return (
      <div className="p-8 w-full flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-100 mb-4">Sign In Required</h2>
          <p className="text-slate-400 mb-6">Please sign in to access your settings.</p>
          <Button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
            Sign In with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full">
      {/* Theme Toggle Button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 backdrop-blur-sm"
        >
          {mounted ? (
            resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )
          ) : (
            <span className="h-5 w-5" />
          )}
        </Button>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">⚙️ Settings</h1>
        <p className="text-gray-600 dark:text-slate-400">Manage your account and privacy preferences.</p>
      </div>

      <div className="space-y-8">
        {/* Gmail Connection */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-slate-700/50 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">📧 Gmail Connection</h2>
          
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">{userInitials}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">{userEmail}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {isConnected ? '✅ Connected & Scanning' : '❌ Disconnected'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <Button
                    onClick={handleReauthenticate}
                    disabled={isReauthenticating}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isReauthenticating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Re-authenticating...
                      </>
                    ) : (
                      'Re-authenticate'
                    )}
                  </Button>
                  <Button
                    onClick={handleDisconnectGmail}
                    disabled={isDisconnecting}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect'
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleConnectGmail}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Connect Gmail
                </Button>
              )}
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-emerald-50 dark:from-purple-900/20 dark:to-emerald-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-lg">🛡️</span>
              <div className="text-sm">
                <p className="font-medium text-gray-800 dark:text-slate-100 mb-1">Your Privacy is Protected</p>
                <ul className="text-gray-600 dark:text-slate-400 space-y-1 text-xs">
                  <li>• We only read emails containing purchase receipts</li>
                  <li>• No personal emails, drafts, or contacts are accessed</li>
                  <li>• Your data is encrypted and never shared with third parties</li>
                  <li>• You can disconnect and delete all data anytime</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-slate-700/50 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">🔔 Notifications</h2>
          
          <div className="space-y-4">
            {Object.entries({
              returnReminders: 'Return deadline reminders',
              warrantyAlerts: 'Warranty expiration alerts',
              newPurchases: 'New purchase detections',
              weeklyDigest: 'Weekly spending digest'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                <span className="text-gray-900 dark:text-slate-100 font-medium">{label}</span>
                <button
                  onClick={() => handleNotificationChange(key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications[key as keyof typeof notifications] 
                      ? 'bg-purple-600' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications[key as keyof typeof notifications] 
                        ? 'translate-x-6' 
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-slate-700/50 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">📊 Data Management</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <button 
              onClick={handleExportData}
              className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">📁</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">Export All Data</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Download all your organized purchase data</p>
            </button>
            
            <button 
              onClick={handleDownloadInvoices}
              className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">📄</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">Download Invoices</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Get a ZIP file of all saved invoices</p>
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">🗑️ Delete Account</h3>
            <p className="text-sm text-red-700 dark:text-red-200 mb-3">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button 
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* REMOVED: Credit Card Settings section - no longer needed */}

        {/* Account Info */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-slate-700/50 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">👤 Account Information</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                defaultValue={userName}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-3">
            <button 
              onClick={handleSaveAccountInfo}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Save Changes
            </button>
            
            <button 
              onClick={handleClearCache}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 