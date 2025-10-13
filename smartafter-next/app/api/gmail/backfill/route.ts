import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getOlderEmails } from '@/lib/gmail';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before'); // YYYY-MM-DD or YYYY/MM/DD
    const pageToken = searchParams.get('pageToken') || undefined;
    const maxResultsParam = searchParams.get('maxResults');
    const maxResults = maxResultsParam ? Math.min(parseInt(maxResultsParam, 10) || 50, 100) : 50;

    if (!before) {
      return NextResponse.json({ error: 'Missing before parameter' }, { status: 400 });
    }

    const iso = before.includes('/') ? before.replace(/\//g, '-') : before;
    const beforeDate = new Date(iso);
    if (isNaN(beforeDate.getTime())) {
      return NextResponse.json({ error: 'Invalid before date' }, { status: 400 });
    }

    const { emails, nextPageToken } = await getOlderEmails(beforeDate, maxResults, pageToken);

    return NextResponse.json({ emails, nextPageToken });
  } catch (error) {
    
    return NextResponse.json({ error: 'Failed to backfill emails' }, { status: 500 });
  }
}

