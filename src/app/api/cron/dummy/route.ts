import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // This is a dummy cron job endpoint
    // Add your actual cron job logic here when ready
    
    const timestamp = new Date().toISOString();
    const message = `Dummy cron job executed successfully at ${timestamp}`;
    
    console.log(`[CRON] ${message}`);
    
    // You can add actual business logic here, such as:
    // - Database cleanup
    // - Sending scheduled emails
    // - Data synchronization
    // - Report generation
    // etc.
    
    return NextResponse.json({
      success: true,
      message,
      timestamp,
      environment: process.env.NODE_ENV
    }, { status: 200 });
    
  } catch (error) {
    console.error('[CRON ERROR]', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cron job failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Vercel cron jobs only support GET requests
export const runtime = 'nodejs'; 