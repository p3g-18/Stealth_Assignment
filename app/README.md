# Agent Activity Explorer: app

Part A of the take-home. React + TypeScript + Vite, TanStack Query, Tailwind CSS.

## Scripts

```bash
npm install
npm run dev       # dev server on http://localhost:5173
npm run build     # type-check and production build into dist/
npm run preview   # serve the production build
npm run lint      # oxlint
```

The app expects the mock API on `http://localhost:4000` (`npm run api` from the repo root). To use another address, set `VITE_API_URL`, e.g. `VITE_API_URL=http://localhost:4100 npm run dev`.

## Layout

| Path | What's there |
|---|---|
| `src/api/` | API client, types, TanStack Query setup and hooks, the `/stream` (SSE) client |
| `src/components/` | Table, filters, detail panel, live feed, loading/empty/error states |
| `src/lib/` | URL state (filters and the open event), formatting, live-event logic |
