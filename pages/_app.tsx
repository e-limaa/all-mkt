import type { AppProps } from "next/app";

if (process.env.NODE_ENV === "development") {
  if (typeof window !== "undefined") {
    import("react-grab");
  }
}
import { useEffect } from "react";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";
import posthog from "posthog-js";
import { Inter } from "next/font/google";

import "../app/instrumentation-client";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

function PosthogPageViewTracker() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleRouteChange = () => {
      posthog.capture("$pageview");
      posthog.startSessionRecording();
    };

    handleRouteChange();
    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <style jsx global>{`
        html {
          font-family: ${inter.style.fontFamily};
        }
      `}</style>
      <PosthogPageViewTracker />
      <div className={`min-h-screen bg-background text-foreground antialiased ${inter.className}`}>
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}
