export const dispatcher = new Proxy(
  {},
  {
    get: () => {
      return () => {};
    },
  },
);

export function renderAppDevOverlay() {
  // intentionally no-op to hide the Next.js devtools overlay during development
}

export function renderPagesDevOverlay() {
  // intentionally no-op to hide the Next.js devtools overlay during development
}
