# ChatNest UI Tailwind + TypeScript redesign

## What changed

- Converted all application source JavaScript files under `src/` from `.js` to `.ts`.
- Converted `vite.config.js` to `vite.config.ts`.
- Removed explicit relative `.js` import extensions so Vite/TypeScript resolves the new `.ts` files cleanly.
- Updated `tsconfig.json` for TypeScript-only source files: `allowJs: false`.
- Added a Tailwind-based redesign in `src/shared/styles/tailwind.css` using the current semantic class names, so the React component logic and data flow remain unchanged.
- Kept existing SCSS variables/reset as theme foundations and loaded the Tailwind redesign after them.
- Fixed a case-sensitive asset import for `defaultImagePlaceholder.webp`.
- Fixed the service worker lint issues without changing notification/caching behavior.
- Disabled `vite-plugin-mkcert` during test mode so tests do not try to download mkcert metadata from GitHub.
- Updated the Rolldown warning option in `vite.config.ts` from the old kebab-case key to `invalidAnnotation`.

## Files intentionally left as JavaScript

- `public/service-worker.js`: must remain JavaScript because it is served directly by the browser from `public/`.
- `eslint.config.js`: kept as JavaScript so the existing ESLint command works without adding another config loader.

## Verification

The following commands passed:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Logic note

No API, SignalR, Redux, Firebase, routing, or message/call behavior was intentionally changed. The redesign is applied through Tailwind utility composition over the existing class names.
