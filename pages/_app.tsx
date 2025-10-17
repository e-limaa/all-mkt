import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import "../styles/globals.css";
import N8nFloatingWidget from "@/components/chat/N8nFloatingWidget";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-background text-foreground antialiased">
        <Component {...pageProps} />
        <N8nFloatingWidget />
      </div>
    </ThemeProvider>
  );
}
