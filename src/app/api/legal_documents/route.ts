import { NextRequest, NextResponse } from 'next/server';
import { getLegalDocument, updateLegalDocument } from '@/api/legal-documents/actions';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  if (type !== 'terms' && type !== 'privacy') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  const doc = await getLegalDocument(type as 'terms' | 'privacy');
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(doc, { status: 200 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, content, effectiveDate } = body;
  if (type !== 'terms' && type !== 'privacy') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  const success = await updateLegalDocument(type, content, effectiveDate);
  if (!success) return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 200 });
}
