import { updateProfessionalMaxServices } from '@/lib/admin/updateProfessionalMaxServices';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  let maxServices: number | undefined;
  try {
    const body = await req.json();
    maxServices = body.maxServices;
    if (typeof maxServices !== 'number' || maxServices < 1) {
      return NextResponse.json({ error: 'Invalid maxServices' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const result = await updateProfessionalMaxServices(userId, maxServices);
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
