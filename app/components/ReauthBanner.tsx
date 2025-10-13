'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function ReauthBanner() {
  const { data: session } = useSession();

  if (!session?.needsReauth) {
    return null;
  }

  const handleReauth = async () => {
    await signOut({ 
      callbackUrl: '/landing',
      redirect: true 
    });
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
            Gmail Access Required
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            Your Gmail permissions have expired. Please sign in again to access your purchase data.
          </p>
        </div>
        <Button
          onClick={handleReauth}
          size="sm"
          variant="outline"
          className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Re-authenticate
        </Button>
      </div>
    </div>
  );
}

