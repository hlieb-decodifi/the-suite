import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    console.log('🔧 Running dummy cron job...');
    
    // Clean up orphaned pending_payment bookings older than 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const { data: orphanedBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, created_at')
      .eq('status', 'pending_payment')
      .lt('created_at', twentyFourHoursAgo.toISOString());
    
    if (fetchError) {
      console.error('Error fetching orphaned bookings:', fetchError);
    } else if (orphanedBookings && orphanedBookings.length > 0) {
      console.log(`Found ${orphanedBookings.length} orphaned pending_payment bookings to clean up`);
      
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('status', 'pending_payment')
        .lt('created_at', twentyFourHoursAgo.toISOString());
      
      if (deleteError) {
        console.error('Error cleaning up orphaned bookings:', deleteError);
      } else {
        console.log(`✅ Successfully cleaned up ${orphanedBookings.length} orphaned bookings`);
      }
    } else {
      console.log('ℹ️ No orphaned pending_payment bookings found');
    }
    
    console.log('✅ Dummy cron job completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Dummy cron job executed successfully',
      cleanedBookings: orphanedBookings?.length || 0
    });
  } catch (error) {
    console.error('❌ Error in dummy cron job:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

// Vercel cron jobs only support GET requests
export const runtime = 'nodejs'; 