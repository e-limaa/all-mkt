import posthog from "posthog-js";

declare global {
  interface Window {
    __POSTHOG_INITIALIZED__?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__POSTHOG_INITIALIZED__) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2025-05-24",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
    capture_pageview: true,
    person_profiles: "identified_only",
    autocapture: true,
    session_recording: {
      maskAllInputs: false,
      recordCrossOriginIFrames: false,
    },
  });

  posthog.startSessionRecording();
  window.__POSTHOG_INITIALIZED__ = true;
}

export default posthog;
