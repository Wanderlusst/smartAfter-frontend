import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for background job status
// In production, you'd use Redis or a database
let backgroundJobStatus = {
  isActive: false,
  progress: 0,
  message: 'Idle',
  status: 'idle' as 'idle' | 'syncing' | 'success' | 'error',
  documentsFound: 0,
  lastSyncTime: null as string | null,
  startTime: null as number | null
};

export async function GET() {
  try {
    // Calculate progress if job is active
    if (backgroundJobStatus.isActive && backgroundJobStatus.startTime) {
      const elapsed = Date.now() - backgroundJobStatus.startTime;
      const estimatedDuration = 30000; // 30 seconds estimated
      backgroundJobStatus.progress = Math.min(95, Math.floor((elapsed / estimatedDuration) * 100));
    }

    return NextResponse.json({
      ...backgroundJobStatus,
      isActive: backgroundJobStatus.isActive,
      progress: backgroundJobStatus.progress,
      message: backgroundJobStatus.message,
      status: backgroundJobStatus.status,
      documentsFound: backgroundJobStatus.documentsFound,
      lastSyncTime: backgroundJobStatus.lastSyncTime
    });
  } catch {
    return NextResponse.json({ 
      error: 'Failed to get background status' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      isActive, 
      progress, 
      message, 
      status, 
      documentsFound 
    } = body;

    // Update status
    backgroundJobStatus = {
      ...backgroundJobStatus,
      isActive: isActive ?? backgroundJobStatus.isActive,
      progress: progress ?? backgroundJobStatus.progress,
      message: message ?? backgroundJobStatus.message,
      status: status ?? backgroundJobStatus.status,
      documentsFound: documentsFound ?? backgroundJobStatus.documentsFound,
      lastSyncTime: status === 'success' ? new Date().toISOString() : backgroundJobStatus.lastSyncTime,
      startTime: isActive && !backgroundJobStatus.isActive ? Date.now() : backgroundJobStatus.startTime
    };

    // Auto-reset after success
    if (status === 'success') {
      setTimeout(() => {
        backgroundJobStatus = {
          ...backgroundJobStatus,
          isActive: false,
          progress: 0,
          message: 'Idle',
          status: 'idle',
          startTime: null
        };
      }, 5000); // Hide after 5 seconds
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ 
      error: 'Failed to update background status' 
    }, { status: 500 });
  }
}