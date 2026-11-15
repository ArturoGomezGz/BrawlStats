import { redirect } from 'next/navigation';
import { normalizeTag } from '../../lib/tag';

export default async function Buscar({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const normalized = normalizeTag(tag ?? '');
  redirect(normalized ? `/jugador/${normalized}` : '/?error=tag');
}
