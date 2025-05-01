import { deleteServiceAction } from '@/api/services/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; serviceId: string }> }
) {
  const { userId, serviceId } = await params;
  const result = await deleteServiceAction(userId, serviceId);
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  
  return NextResponse.json({ success: true });
} 