import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import DocumentsClient from './DocumentsClient';

export default async function Documents() {
  const session = await getServerSession(authOptions);
  
  console.log('🔐 AUTH DEBUG - Session in documents page:', {
    hasSession: !!session,
    userEmail: session?.user?.email,
    hasAccessToken: !!session?.accessToken,
    hasRefreshToken: !!session?.refreshToken,
    needsReauth: session?.needsReauth,
    scope: session?.scope
  });
  
  if (!session) {
    console.log('🔐 AUTH DEBUG - No session, redirecting to landing');
    redirect('/landing');
  }
  
  if (session.needsReauth) {
    console.log('🔐 AUTH DEBUG - Needs reauth, redirecting to landing');
    redirect('/landing');
  }

  try {
    // NO SAMPLE DATA - Only real Gmail documents
    let documentsData = [];
    
    // NO SAMPLE DATA - Start with empty
    const realDocuments = [];
    let documentsToShow = [];
    let totalCount = 0;
    
    return (
      <DocumentsClient 
        session={session}
        initialDocuments={documentsToShow}
        totalCount={totalCount}
      />
    );
  } catch (error) {

    // Return empty state if there's an error
    return (
      <DocumentsClient 
        session={session}
        initialDocuments={[]}
        totalCount={0}
      />
    );
  }
}