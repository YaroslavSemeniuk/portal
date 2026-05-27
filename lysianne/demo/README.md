# Trading Gatekeeper (Demo)

Vite + React + TypeScript demo for the Trading Gatekeeper platform: rule setup, execution dashboard, 4-step order flow, gatekeeper checks, synthetic price simulator, trade journal, and lightweight-charts trading view. Product spec: [`PRD_SOW_Trading_Gatekeeper_v2.1.md`](./PRD_SOW_Trading_Gatekeeper_v2.1.md).

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm

## Run locally

From the repository root:

```bash
npm install
npm run dev
```

Vite serves the app (default: http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with HMR |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## Styles

One source of truth: `src/styles/app.css` (imported once from `main.tsx`). Tokens and layout live at the top; the marked tail block applies v2 polish—keep that order when editing so utilities do not fight earlier rules.

## Structure

- `src/app/` — `App.tsx` (router, rules guard, sim lifecycle, reset demo), `toast.tsx`, `tradeDraft.tsx`
- `src/features/` — route-level UI: `entry`, `rules`, `dashboard`, `trade` (`OrderPanel.tsx`), `post`, `journal`, `session`
- `src/components/` — `layout/` (sidebar, topbar, demo toggles, banners), `trade/` (`TradeChart`), `ui/`, `daily-loss/`
- `src/lib/` — `data.ts`, `sim.ts`, `store.ts`, `gatekeeper.ts`, `orderCalc.ts`, `positionActions.ts`, `format.ts`, `chartConstants.ts`, `tradeDraft.ts`, `types.ts`, and related helpers
- `src/styles/` — **`app.css` only** (single import in `main.tsx`): design tokens + document shell (`:root`, `body`, `#root`, `#app`), then base component rules, then a trailing **v2 override block**. Do not add parallel global stylesheets; extend `app.css` or switch to CSS modules deliberately.

Routes: `/entry`, `/rules`, `/dashboard`, `/trade`, `/post`, `/journal`. Until rules are confirmed, `/dashboard`, `/trade`, `/post`, and `/journal` redirect to `/rules`.

## State

- App state: `src/lib/store.ts` — key `gk-design-state-v1` (localStorage).
- Trade form draft (steps, symbol, risk, SL/TP): React context in `src/app/tradeDraft.tsx` (not persisted; reset clears it).
