import { NextResponse } from 'next/server';
import { inviteAdminAction } from '@/api/auth/actions';

export async function POST(request: Request) {
  const { email, firstName, lastName } = await request.json();
  const result = await inviteAdminAction(email, firstName, lastName);
  return NextResponse.json(result);
}
