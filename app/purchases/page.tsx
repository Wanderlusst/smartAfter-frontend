import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import PurchasesClient from './PurchasesClient';

export default async function PurchasesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/landing');
  }

  return <PurchasesClient />;
}