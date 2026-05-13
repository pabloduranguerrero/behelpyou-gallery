import './globals.css';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { LOGO_SRC } from '@/lib/assets';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap'
});

const body = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap'
});

export const metadata = {
  title: 'BeHelpYou Gallery',
  description: 'Galería privada de momentos para tu boda — sube y comparte recuerdos en segundos.',
  themeColor: '#faf8f4',
  icons: { icon: LOGO_SRC }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
