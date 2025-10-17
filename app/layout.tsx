import type { Metadata } from "next";
import "../styles/globals.css";
import N8nFloatingWidget from "@/components/chat/N8nFloatingWidget";

export const metadata: Metadata = {
  title: {
    default: "ALL MKT - Auth",
    template: "%s - ALL MKT",
  },
  description: "Fluxos de autenticacao do ALL MKT alinhados a experiencia existente.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <N8nFloatingWidget />
      </body>
    </html>
  );
}
