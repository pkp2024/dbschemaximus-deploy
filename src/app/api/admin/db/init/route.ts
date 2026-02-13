import { NextResponse } from 'next/server';
import { ensureDbSchema } from '@/lib/server/postgres';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const adminKey = process.env.ADMIN_API_KEY;
  const provided = request.headers.get('x-admin-key');

  if (!adminKey) {
    return NextResponse.json({ error: 'ADMIN_API_KEY is not configured' }, { status: 500 });
  }

  if (!provided || provided !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDbSchema();
  return NextResponse.json({ ok: true });
}
