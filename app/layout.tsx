import type { Metadata } from 'next';
import { Rajdhani, Noto_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-rajdhani',
});

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-noto',
});

export const metadata: Metadata = {
  title: 'Prode Mundial 2026',
  description:
    'Pronostica los partidos de la Copa del Mundo FIFA 2026 y competi en el ranking en tiempo real.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${rajdhani.variable} ${notoSans.variable}`}>
      <body>
        <Providers>
          <Navbar />
          <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
            <main className="min-w-0 flex-1">{children}</main>
            <Sidebar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
