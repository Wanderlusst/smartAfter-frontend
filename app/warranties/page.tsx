import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import WarrantiesClient from './WarrantiesClient';

export default async function Warranties() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/landing');
  }

  return <WarrantiesClient />;
}