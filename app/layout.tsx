import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ALL MKT – Auth',
    template: '%s · ALL MKT',
  },
  description: 'Fluxos de autenticação do ALL MKT alinhados à experiência existente.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
