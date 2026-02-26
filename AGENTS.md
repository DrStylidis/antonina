# Antonina — Agent Instructions

## Overview

Antonina is an Electron desktop app (React 19 + TypeScript + Tailwind v4 + shadcn/ui) powered by Claude AI. It manages emails, calendar, and tasks for startup founders. See `README.md` for full architecture and project structure.

## Cursor Cloud specific instructions

### Running the app in headless/VM environments

- The Electron main process requires `app.disableHardwareAcceleration()` in `src/main/index.ts` for VM environments without a GPU. This is already added.
- To run in dev mode: `DISPLAY=:1 npm run dev` (the VM display is `:1`).
- The Vite dev server serves the renderer at `http://localhost:5173/`. The Electron window also renders on the display.
- D-Bus errors in the console (`Failed to connect to the bus`) are expected and harmless in this environment.

### Configuration files

- Copy `config.example.yaml` to `config.yaml` and `.env.example` to `.env` before running. Both are gitignored.
- The app starts and renders the UI even without valid API keys; views will show "Something went wrong" for data-fetching views, which is expected.

### Standard commands

All standard dev commands are in `package.json`:

| Task | Command |
|------|---------|
| Dev mode | `npm run dev` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Build | `npx electron-vite build` |
| Format | `npm run format` |

### Pre-existing lint/typecheck issues

- `npm run lint` exits with errors (128 errors, 431 warnings) — mostly prettier formatting and a few TS-eslint rules. These are pre-existing.
- `npm run typecheck` has 2 pre-existing errors: an unused import in `chat-session.ts` and a type mismatch in `config.ts`.

### Native modules

- `better-sqlite3` is a native addon. The `postinstall` script (`electron-builder install-app-deps`) handles rebuilding it for the correct Electron version. If you see SQLite errors after an npm install, run `npx electron-builder install-app-deps` manually.

### No test framework

- There are no automated tests configured in this project. Validation is done via lint, typecheck, build, and manual testing of the running Electron app.
