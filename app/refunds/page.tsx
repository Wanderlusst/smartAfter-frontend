import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import RefundsClient from './RefundsClient';

export default async function RefundsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/landing');
  }

  return <RefundsClient />;
} 