import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  // Check if user is authenticated
  const session = await getServerSession(authOptions);
  
  if (session && session.user && session.user.email) {
    // If authenticated, redirect to dashboard
    redirect('/dashboard');
  } 
  
  // If not authenticated, redirect to landing page
  redirect('/landing');
}

// Add metadata to ensure this is recognized as a page
export const metadata = {
  title: 'SmartAfter - Home',
  description: 'SmartAfter - Your intelligent financial companion',
};

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';
