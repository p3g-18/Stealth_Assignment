# Agent Activity Explorer

Frontend take-home: **Part A** (React dashboard) and **Part B** (Perf Clinic).

- [NOTES.md](NOTES.md): what I built, key decisions, trade-offs and AI usage
- [PERF.md](PERF.md): the Part B performance fixes with before/after numbers
- [ASSIGNMENT.md](ASSIGNMENT.md): the original brief and API reference

## Run it

```bash
npm install
npm run api            # mock API on http://localhost:4000 (keep it running)
```

In a second terminal:

```bash
cd app
npm install
npm run dev            # Part A dashboard on http://localhost:5173
```

From the repo root:

```bash
npm run perf-clinic    # Part B page on http://localhost:5174
```

| Path | What it is |
|---|---|
| `app/` | Part A: the Agent Activity Explorer (React, TypeScript, Vite) |
| `perf-clinic/` | Part B: the fixed page |
| `scripts/perf-measure.mjs` | Measures the Part B page under fixed conditions (`node scripts/perf-measure.mjs http://localhost:5174/`) |
| `scripts/` | Also contains the launchers for `npm run api` and `npm run perf-clinic` |
| `bin/` | Prebuilt mock API binaries; `npm run api` picks the right one |
