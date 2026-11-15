import { NextResponse } from 'next/server';
import { errorText, getPlayer } from '../../../lib/api';

export const dynamic = 'force-dynamic';

/** Brawlers que tiene un jugador, para limitar las sugerencias a lo que puede jugar. */
export async function GET(req: Request) {
  const tag = new URL(req.url).searchParams.get('tag') ?? '';
  const res = await getPlayer(tag.replace(/^#/, ''));
  if (!res.ok) return NextResponse.json({ message: errorText(res.error) }, { status: 400 });
  return NextResponse.json({
    name: res.data.name,
    brawlers: res.data.brawlers.map((b) => b.name.toUpperCase()),
  });
}
