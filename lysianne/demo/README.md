# Gatekeeper (React)

Vite + React + TypeScript port of the `design/` Gatekeeper prototype: same demo flows, localStorage-backed store, synthetic price simulator, gatekeeper checks, and lightweight-charts trading view.

## Run

```bash
cd react
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Styles

One source of truth: `src/styles/app.css` (imported once from `main.tsx`). Tokens and layout live at the top; the marked tail block applies v2 polish—keep that order when editing so utilities do not fight earlier rules.

## Structure

- `src/app/` — `App.tsx` (router, rules guard, sim lifecycle, reset demo), `toast.tsx`, `tradeDraft.tsx`
- `src/features/` — route-level UI: `entry`, `rules`, `dashboard`, `trade` (`OrderPanel.tsx`), `post`, `journal`
- `src/components/` — `layout/` (sidebar, topbar, demo toggles), `trade/` (`TradeChart`), `ui/` (sparkline, close modal)
- `src/lib/` — `data.ts` (seed + instruments), `sim.ts`, `store.ts` (localStorage), `gatekeeper.ts`, `orderCalc.ts`, `positionActions.ts`, `format.ts`, `chartConstants.ts`, `tradeDraft.ts`, `types.ts`
- `src/styles/` — **`app.css` only** (single import in `main.tsx`): design tokens + document shell (`:root`, `body`, `#root`, `#app`), then base component rules, then a trailing **v2 override block** (same cascade as the old `styles.css` → `styles-v2.css` order). Do not add parallel global stylesheets; extend `app.css` or switch to CSS modules deliberately.

Routes: `/entry`, `/rules`, `/dashboard`, `/trade`, `/post`, `/journal`. Until rules are confirmed, `/dashboard`, `/trade`, `/post`, and `/journal` redirect to `/rules`.

## State

- App state: `src/lib/store.ts` — key `gk-design-state-v1` (same as the HTML prototype).
- Trade form draft (steps, symbol, risk, SL/TP): React context in `src/app/tradeDraft.tsx` (not persisted; reset clears it).
