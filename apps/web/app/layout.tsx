import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brawl Stats',
  description: 'Estadísticas de jugadores de Brawl Stars',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <footer className="site-footer">
          Proyecto de fans. No está afiliado, patrocinado ni aprobado por Supercell.
        </footer>
      </body>
    </html>
  );
}
