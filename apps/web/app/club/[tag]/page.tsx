import Link from 'next/link';
import { notFound } from 'next/navigation';
import { normalizeTag } from '@brawlstats/brawl-client/tag';
import { ErrorView } from '../../../components/error-view';
import { getClub } from '../../../lib/api';
import { formatNumber } from '../../../lib/format';

export const dynamic = 'force-dynamic';

const ROLES: Record<string, string> = {
  president: 'Presidente',
  vicePresident: 'Vicepresidente',
  senior: 'Veterano',
  member: 'Miembro',
};

export default async function Club({ params }: { params: Promise<{ tag: string }> }) {
  const tag = normalizeTag((await params).tag);
  if (!tag) notFound();

  const result = await getClub(tag);
  if (!result.ok) return <ErrorView result={result} />;
  const club = result.data;
  const members = [...club.members].sort((a, b) => b.trophies - a.trophies);

  return (
    <main>
      <Link href="/" className="back">
        ← Buscar jugador
      </Link>
      <h1>{club.name}</h1>
      <p className="muted">#{tag}</p>
      {club.description && <p>{club.description}</p>}

      <section className="stats">
        <div>
          <strong>{formatNumber(club.trophies)}</strong>
          <span>Trofeos</span>
        </div>
        <div>
          <strong>{members.length}</strong>
          <span>Miembros</span>
        </div>
        {club.requiredTrophies !== undefined && (
          <div>
            <strong>{formatNumber(club.requiredTrophies)}</strong>
            <span>Trofeos requeridos</span>
          </div>
        )}
      </section>

      <section>
        <h2>Miembros</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Rol</th>
              <th className="num">Trofeos</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.tag}>
                <td>{i + 1}</td>
                <td>
                  <Link href={`/jugador/${m.tag.replace('#', '')}`}>{m.name}</Link>
                </td>
                <td>{ROLES[m.role] ?? m.role}</td>
                <td className="num">{formatNumber(m.trophies)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
