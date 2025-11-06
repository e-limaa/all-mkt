import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";
import posthog from "posthog-js";

import "../app/instrumentation-client";
import "../styles/globals.css";

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
      <PosthogPageViewTracker />
      <div className="min-h-screen bg-background text-foreground antialiased">
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}
