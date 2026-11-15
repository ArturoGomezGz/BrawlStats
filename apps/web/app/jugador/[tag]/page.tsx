import Link from 'next/link';

export default async function Jugador({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;

  return (
    <main>
      <h1>#{tag}</h1>
      <p>El perfil del jugador llega en el hito 3, cuando la API ya consulte a Supercell.</p>
      <Link href="/">Volver</Link>
    </main>
  );
}
