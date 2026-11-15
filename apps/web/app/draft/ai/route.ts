import { NextResponse } from 'next/server';
import { analyzeDraft } from '../../../lib/api';

export const dynamic = 'force-dynamic';

/** El navegador no ve la api (red privada): este endpoint le pasa el draft. */
export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const res = await analyzeDraft(body);
  if (res.ok) return NextResponse.json(res.data);
  return NextResponse.json({ error: res.error, message: res.message }, { status: 502 });
}
