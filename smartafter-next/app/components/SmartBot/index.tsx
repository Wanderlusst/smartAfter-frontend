"use client";
import React from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import ChatBubble from './ChatBubble';
import ChatWindow from './ChatWindow';

const SmartBot: React.FC = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  
  // Don't show SmartBot if:
  // 1. User is not authenticated
  // 2. Still loading authentication
  // 3. On landing page or root page
  const shouldHideBot = 
    status === 'loading' || 
    !session || 
    pathname === '/' || 
    pathname === '/landing';

  if (shouldHideBot) {
    return null;
  }

  return (
    <>
      <ChatBubble />
      <ChatWindow />
    </>
  );
};

export default SmartBot; 