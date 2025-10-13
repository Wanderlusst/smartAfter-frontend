'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';

export function GmailAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  const handleGmailAuth = async () => {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    try {
      // Request Gmail scope separately for better performance
      const gmailAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/gmail-callback')}` +
        `&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly')}` +
        `&response_type=code` +
        `&access_type=offline` +
        `&prompt=consent`;

      window.location.href = gmailAuthUrl;
    } catch (error) {
      
      setIsLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <Button
      onClick={handleGmailAuth}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? 'Connecting to Gmail...' : 'Connect Gmail for Purchase Data'}
    </Button>
  );
}

