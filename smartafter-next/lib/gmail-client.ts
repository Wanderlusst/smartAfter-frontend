'use client';

export type ClientGmailEmail = {
  id: string;
  messageId: string;
  date: string;
  subject: string;
  from: string;
  vendor: string;
  amount: string;
  isInvoice: boolean;
};

export type BackfillOptions = {
  beforeDateISO: string; // e.g., '2025-08-01'
  batchSize?: number; // maxResults per page (<=100)
  maxBatches?: number; // safety cap
  onBatch?: (emails: ClientGmailEmail[]) => void;
};

export async function fetchOlderEmailsPage(beforeDateISO: string, batchSize: number = 50, pageToken?: string) {
  const params = new URLSearchParams();
  params.set('before', beforeDateISO);
  params.set('maxResults', String(Math.min(batchSize, 100)));
  if (pageToken) params.set('pageToken', pageToken);

  const res = await fetch(`/api/gmail/backfill?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Backfill request failed: ${res.status}`);
  return res.json() as Promise<{ emails: ClientGmailEmail[]; nextPageToken?: string }>;
}

// Run incrementally after hydration without blocking main thread
export async function backfillOlderEmails(options: BackfillOptions) {
  const { beforeDateISO, batchSize = 50, maxBatches = 5, onBatch } = options;

  let pageToken: string | undefined = undefined;
  let batches = 0;

  while (batches < maxBatches) {
    // Yield to the main thread between batches
    await new Promise<void>((resolve) => {
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(() => resolve(), { timeout: 2000 });
      } else {
        setTimeout(() => resolve(), 100);
      }
    });

    const { emails, nextPageToken } = await fetchOlderEmailsPage(beforeDateISO, batchSize, pageToken);
    if (emails && emails.length) {
      onBatch?.(emails);
    }
    if (!nextPageToken) break;
    pageToken = nextPageToken;
    batches += 1;
  }
}

