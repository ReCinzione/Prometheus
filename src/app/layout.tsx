import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Prometheus',
  description: 'La tua app con Next.js 13 + Tailwind + ShadCN UI',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
