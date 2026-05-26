# Figma Wireframe Generation Prompt
## Trading Gatekeeper Platform — V1 Demo Mode

**Target model:** Claude Opus with Figma MCP tools  
**Fidelity:** Mid-fi hybrid wireframes — grayscale structure + signal colors (red/green/amber) ONLY for Gatekeeper states  
**Deliverable:** Static frames (no clickable prototype connections)  
**Scope:** All 8 screens + every Gatekeeper blocked/warning state

---

## How to use this prompt

Paste this entire document into Claude Opus with Figma MCP tools enabled. Execute sections sequentially (Part 1 → 2 → 3 → 4). Do not skip Part 1 — the token set and component library are prerequisites for every screen.

---

# Part 1 — Foundation

## 1.1 What these wireframes ARE and ARE NOT

**These wireframes ARE:**
- Mid-fidelity structural blueprints showing layout, hierarchy, content regions, copy, and state transitions
- Grayscale grids of boxes, dividers, and labeled content placeholders
- Real copy (exact strings from the PRD) so stakeholders can review tone and messaging
- Signal-color-coded ONLY for Gatekeeper status (red = blocked, amber = warning, green = all clear) — because color IS the logic for these states and cannot be conveyed structurally
- Production-ready spacing and proportions so the next fidelity pass can map 1:1

**These wireframes ARE NOT:**
- Final visual design (no brand colors beyond signal traffic-light, no custom typography, no decorative elements)
- Icon-rich (use only 6 primitive icons: ↗ ↘ + × ● ✓)
- Realistic charts or price feeds (use placeholder line/bar shapes)
- Pixel-perfect mockups (assume ±4px tolerance)

## 1.2 File structure

Create one Figma file with these pages in this exact order:

```yaml
file_name: "Trading Gatekeeper — V1 Wireframes"
pages:
  - "01 · Tokens & Components"
  - "02 · S1 Demo Entry"
  - "03 · S2 Rule Setup"
  - "04 · S3 Dashboard"
  - "05 · S4 Instrument & Direction"
  - "06 · S5 Risk & Stop Loss"
  - "07 · S5 Gatekeeper States (all 16 variants incl. TC 10.6 soft block)"
  - "08 · S6 Review & Confirm"
  - "09 · S7 Post-Execution"
  - "10 · S8 Trade Journal"
```

Desktop frame size for every screen: **1440 × 900 px**.

## 1.3 Wireframe token set

Create Color Styles in Figma with these exact names and values. Do NOT use any colors outside this set.

```yaml
# Grayscale (structural)
wf/bg:              "#FAFAFA"   # page background (light wireframe convention)
wf/surface:         "#FFFFFF"   # cards, panels
wf/border:          "#D4D4D4"   # 1px borders, dividers
wf/border-strong:   "#9CA3AF"   # 2px emphasis borders
wf/placeholder:     "#E5E5E5"   # image/chart placeholders (diagonal stripes)
wf/text-primary:    "#1A1A1A"   # main content
wf/text-secondary:  "#6B7280"   # labels, metadata
wf/text-muted:      "#9CA3AF"   # hints, disabled states
wf/disabled-bg:     "#F3F4F6"   # disabled input/button fills

# Signal colors — ONLY for Gatekeeper status
signal/red:         "#DC2626"   # blocked states
signal/red-bg:      "#FEE2E2"   # blocked state background
signal/amber:       "#D97706"   # warning states
signal/amber-bg:    "#FEF3C7"   # warning state background
signal/green:       "#16A34A"   # all-clear state
signal/green-bg:    "#DCFCE7"   # all-clear background
```

**Rule:** `signal/*` colors appear ONLY inside the Gatekeeper status bar, the Execute button, direction buttons (Long/Short), and P&L indicators. Everywhere else is grayscale.

## 1.4 Text styles

```yaml
# Create as Text Styles in Figma
text/heading-xl:    { family: "Inter", weight: 700, size: 28, line: 36 }
text/heading-lg:    { family: "Inter", weight: 600, size: 20, line: 28 }
text/heading-md:    { family: "Inter", weight: 600, size: 16, line: 22 }
text/body:          { family: "Inter", weight: 400, size: 14, line: 20 }
text/body-medium:   { family: "Inter", weight: 500, size: 14, line: 20 }
text/label:         { family: "Inter", weight: 500, size: 12, line: 16, tracking: 0.04 }
text/label-caps:    { family: "Inter", weight: 600, size: 11, line: 14, tracking: 0.08, case: "uppercase" }
text/mono:          { family: "JetBrains Mono", weight: 400, size: 13, line: 18 }  # prices, numbers
text/mono-bold:     { family: "JetBrains Mono", weight: 600, size: 18, line: 22 }  # primary price display
```

**Rule:** Prices, pip values, lot sizes, and any trading number use `text/mono` or `text/mono-bold`. Labels use `text/label-caps`. Everything else uses `text/body`.

---

# Part 2 — Component Library (page "01 · Tokens & Components")

Build these reusable components FIRST. Every screen will instance them. Lay them out in a grid on the Components page with labels.

## 2.1 Global layout shell

Create a master frame `Shell/Desktop-1440` (1440 × 900):

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR  (40px, wf/surface, 1px bottom border wf/border)       │
├──────────┬───────────────────────────────────┬──────────────────┤
│          │                                   │                  │
│ SIDEBAR  │        MAIN CONTENT               │   ORDER PANEL    │
│ 200px    │        fluid (920px)              │   320px fixed    │
│ wf/      │        wf/bg                      │   wf/surface     │
│ surface  │                                   │   1px left border│
│          │                                   │                  │
└──────────┴───────────────────────────────────┴──────────────────┘
```

- Top Bar: 40px height, horizontal flex, `wf/surface` fill
- Sidebar: 200px × 860px, `wf/surface` fill, right border 1px `wf/border`
- Main: 920px × 860px, `wf/bg` fill
- Order Panel: 320px × 860px, `wf/surface` fill, left border 1px `wf/border`

## 2.2 Top Bar component `TopBar/Default`

Horizontal layout with 24px padding:
```
[DEMO MODE badge]  [spacer]  [Balance: $52,840.00]  [P&L: $0.00]  [Daily Loss bar]  [Drawdown bar]
```

- DEMO MODE badge: 6px rounded pill, `wf/border-strong` outline, `text/label-caps`, text "DEMO MODE"
- Numeric values: `text/mono`
- Progress bars: 80px × 6px, `wf/placeholder` track, grayscale fill (0–70% fill = `wf/text-secondary`; 70–90% = `signal/amber`; 90%+ = `signal/red`)

Create variants: `Default` (0% fills), `Warning-85` (amber fills at 85%), `Blocked-100` (red fills at 100%).

## 2.3 Sidebar component `Sidebar/Default`

Vertical list, 16px top padding:
```
[Logo placeholder]     ← 40×40 box, wf/placeholder
────────────────────    ← 1px wf/border divider, 16px gap
Dashboard              ← text/body, 12px H padding, 8px V padding
Trade
Journal
Rules
```

Active tab variant: left 3px `wf/text-primary` bar, bg `wf/bg`, text weight 500.

Create variants: `Active-Dashboard`, `Active-Trade`, `Active-Journal`, `Active-Rules`, `All-Disabled` (used during staleness block — all items `wf/text-muted`).

## 2.4 Order Panel states

The Order Panel is the most complex component. Build it as a single component with multiple variants.

**`OrderPanel/Disabled-S2`** — shown during Rule Setup, before rules are confirmed:
- All content greyed (`wf/text-muted`)
- Header: "ORDER ENTRY" in `text/label-caps`
- Body: placeholder boxes (`wf/disabled-bg` fills)
- Footer text: "Confirm rules to activate trading" in `text/label`, `wf/text-muted`

**`OrderPanel/Step-1`** — Instrument & Direction (S4):
```
┌──────────────────────────┐
│ ORDER ENTRY    EURUSD ▾  │  ← label-caps + dropdown
│ Step 1 of 4              │
├──────────────────────────┤
│   1.08540  |  1.08552    │  ← bid / ask, text/mono-bold
│   spread: 1.2 pips       │
├──────────────────────────┤
│  [  ↗ Long  ][  ↘ Short ]│  ← two 50/50 buttons
├──────────────────────────┤
│                          │
│  [      Continue      ]  │  ← disabled until direction chosen
└──────────────────────────┘
```

**`OrderPanel/Step-2-Empty`** — Risk & Stop Loss, no input yet:
```
┌──────────────────────────┐
│ ORDER ENTRY    EURUSD    │
│ Step 2 of 4              │
├──────────────────────────┤
│ RISK MODE    [% of acc][$]│
│                          │
│  ┌────────────────────┐  │
│  │                    │  │  ← large numeric input, empty
│  └────────────────────┘  │
│  ≈ $—                    │
├──────────────────────────┤
│ ENTRY   STOP LOSS   TP   │  ← 3-col label row
│ 1.08542    ___     ___   │  ← input row, text/mono
├──────────────────────────┤
│ Dollar Risk       $—     │  ← label + value rows
│ Position Size     — lots │
│ SL Distance       — pips │
│ Risk : Reward     —      │
├──────────────────────────┤
│ GATEKEEPER STATUS        │  ← gray bar, "Enter trade parameters."
├──────────────────────────┤
│  [   Continue (off)   ]  │
└──────────────────────────┘
```

**`OrderPanel/Step-2-Filled-AllClear`** — valid input, green state:
- Gatekeeper bar: `signal/green-bg` fill, `signal/green` text, "● ALL CLEAR — All rules satisfied."
- Continue button: `wf/text-primary` fill, white text, active

**`OrderPanel/Step-2-Blocked-Risk`** — red state, risk limit exceeded:
- Gatekeeper bar: `signal/red-bg` fill, `signal/red` text, copy from TC 9.1
- Continue button: disabled

**`OrderPanel/Step-2-Warning-Drawdown`** — green All Clear + amber warning stacked:
- Gatekeeper bar split into two rows:
  - Row 1: `signal/green-bg`, "● ALL CLEAR"
  - Row 2: `signal/amber-bg`, `signal/amber` text, "⚠ WARNING: Approaching daily loss limit — you have used 88% of your daily allowance. 12% remaining."

**`OrderPanel/Step-3-Review`** — Summary card (S6):
```
┌──────────────────────────┐
│ ORDER ENTRY              │
│ Step 3 of 4              │
├──────────────────────────┤
│ SUMMARY                  │
│ Instrument    EUR/USD    │
│ Direction     Long ↗     │  ← signal/green for "Long ↗"
│ Entry         1.08542    │
│ Stop Loss     1.08342    │
│ Take Profit   1.08942    │
│ Position Size 5.28 lots  │  ← wf/text-secondary (de-emphasized)
│ Est. Risk     $1,056.80  │
│ R : R         1:2.00     │
├──────────────────────────┤
│ Disclaimer text (italic) │  ← 3-line italic, wf/text-secondary
├──────────────────────────┤
│ GATEKEEPER: ● All Clear  │
├──────────────────────────┤
│ [Back]  [Execute Long]   │  ← ghost + signal/green fill
└──────────────────────────┘
```

## 2.5 Primary button component `Button/Primary`

Variants:
- `Default`: `wf/text-primary` fill, white text, `text/body-medium`, 44px height
- `Active-Green`: `signal/green` fill, white text (used for Execute, All Clear CTAs)
- `Ghost`: transparent fill, 1px `wf/border` outline, `wf/text-primary` text
- `Disabled`: `wf/disabled-bg` fill, `wf/text-muted` text, no border

## 2.6 Status bar component `GatekeeperBar/*`

This is the most critical component because it has 15 distinct states (14 inline + 1 soft block). Build each as a variant of a single component.

```yaml
variants:
  - name: "Neutral"
    bg: wf/surface
    border-left: none
    icon: none
    text_color: wf/text-secondary
    text: "Enter trade parameters."

  - name: "All-Clear"
    bg: signal/green-bg
    border-left: "3px solid signal/green"
    icon: "●" (signal/green)
    text_color: signal/green
    text: "ALL CLEAR — All rules satisfied. Proceed to review."

  # Blocked states (7)
  - name: "Blocked-Risk-Limit"
    bg: signal/red-bg
    border-left: "3px solid signal/red"
    icon: "🔒" (use Unicode or simple shape)
    title: "1 RULE PREVENTING EXECUTION"
    text: "Risk limit is 2% per trade — you've entered 3.00%. Reduce your risk to proceed."

  - name: "Blocked-No-StopLoss"
    title: "1 RULE PREVENTING EXECUTION"
    text: "No stop-loss set. A stop-loss is required before this trade can exist."

  - name: "Blocked-Daily-Loss"
    title: "1 RULE PREVENTING EXECUTION"
    text: "Daily loss limit reached. You have used 100% of your $2,500 daily allowance. No new trades today."

  - name: "Blocked-News"
    title: "1 RULE PREVENTING EXECUTION"
    text: "News restriction active. High-impact EUR/USD news in 1 minute. Trading resumes at 14:32."
    countdown: true

  - name: "Blocked-Fee-Adjusted"
    title: "1 RULE PREVENTING EXECUTION"
    text: "Fee-adjusted risk would exceed your 2% limit. After accounting for broker spread and commission, this trade costs 2.18%. Reduce your position or widen your stop to proceed."

  - name: "Blocked-Multiple"
    title: "2 RULES PREVENTING EXECUTION"
    text: "Risk limit exceeded (3.00% — max 2%). No stop-loss set. Fix both to proceed."

  - name: "Blocked-Drawdown"
    title: "1 RULE PREVENTING EXECUTION"
    text: "Maximum trailing drawdown reached. You have used 100% of your 10% drawdown allowance ($5,284). No further trading is permitted."

  # Warning states (5) — shown BELOW an All-Clear bar, not replacing it
  - name: "Warning-Drawdown-Proximity"
    bg: signal/amber-bg
    border-left: "3px solid signal/amber"
    icon: "⚠"
    title: "WARNING"
    text: "Approaching daily loss limit — you have used 88% of your daily allowance. 12% remaining."

  - name: "Warning-Consistency"
    text: "Letting this trade run to your target would exceed your consistency score ratio. Consider closing at 1:2 instead of 1:3."

  # Soft block (1) — between warning and hard block, explicit conscious override required
  - name: "SoftBlock-Consistency" # TC 10.6
    bg: signal/amber-bg
    border-left: "3px solid signal/amber"
    outline: "2px solid signal/amber" # denser than warning to signal "block with override"
    icon: "⚠"
    title: "Soft block · Consistency score threshold"
    text: "Executing this trade at your current target would push your consistency score to 31%. Your maximum is 30% — exceeding it may disqualify your payout. Adjust your target or proceed knowing the risk."
    buttons: ["Adjust target (ghost)", "Execute anyway (filled)"]
    behavior: |
      - Shown when projected consistency score ≥ 30% (warning fires at 25%, soft block at 30%).
      - Continue CTA is disabled until one of the two buttons is tapped.
      - "Adjust target" → returns to S5 with the TP field highlighted for edit, Gatekeeper recalculates live.
      - "Execute anyway" → Gatekeeper transitions to "All clear", Continue enabled, conscious override is logged.
      - "Execute anyway" requires an explicit tap — it is NOT the default action.

  - name: "Warning-News-Proximity"
    text: "High-impact news in 22 minutes. Ensure your position is managed before 14:32."

  - name: "Warning-Day-Qualification-Entry"
    text: "Day qualification: your target of +0.9% does not meet the minimum gain required for this day to count (1.0% required)."

  - name: "Warning-Day-Qualification-Exit"
    shape: modal_popup  # this one is a modal, not inline
    text: "Closing here (+0.9%) will not count as a valid trading day — minimum gain required is 1.0%. If you close now, today does not count toward your challenge. Hold to target or accept the consequence."
    buttons: ["Close Anyway", "Keep Open"]
```

## 2.7 Input field component `Input/*`

Variants:
- `Default`: 40px height, 1px `wf/border`, `wf/surface` fill, `text/body` text
- `Focused`: 2px `wf/text-primary` border
- `Error`: 2px `signal/red` border, red hint below
- `Disabled`: `wf/disabled-bg` fill, no border, `wf/text-muted` text
- `With-Adjuster`: includes +/- pip buttons on right side (for SL/TP inputs)

## 2.8 Card component `Card/Default`

- `wf/surface` fill, 1px `wf/border`, border-radius 8px, 16px or 24px padding
- Used for: rule summary, confirmation cards, open position rows, journal entries

## 2.9 Banner component `Banner/*`

Full-width horizontal bar, 48px height, 16px padding:
- `Banner/Info`: `wf/surface` fill
- `Banner/Warning`: `signal/amber-bg` fill, `signal/amber` text
- `Banner/Blocked`: `signal/red-bg` fill, `signal/red` text
- `Banner/Staleness` (non-dismissible): `signal/amber-bg`, text + "Re-confirm current rules" button, NO close icon

---

# Part 3 — Screen Specifications

Each screen is a single frame 1440 × 900 using the Shell component.

## 3.1 Screen 1 — Demo Entry

**Page:** `02 · S1 Demo Entry`

**Critical:** This screen does NOT use the Shell. It is a full-bleed 1440 × 900 frame with only centered content. Sidebar, Top Bar, and Order Panel are ABSENT on S1 — they appear only after entering Demo mode.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                                                      │
│                   [Logo Placeholder]                 │  ← 60px × 60px wf/placeholder
│                                                      │
│                                                      │
│        Trade the right way.                          │  ← text/heading-xl, centered
│        No real money required.                       │
│                                                      │
│   Demo mode lets you experience the full             │  ← text/body, text-secondary,
│   execution flow — including live rule               │     max-width 480px, centered
│   enforcement — without connecting a                 │
│   broker account.                                    │
│                                                      │
│              [     Enter Demo     ]                  │  ← Button/Primary/Active-Green
│                                                      │
│    No real trades. No broker required. Rules run live.│ ← text/label, text-muted
│                                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Create one additional frame** next to this one labeled "S1 Mobile Fallback":
- Same 1440 × 900 frame
- Different copy in content block: "This platform is designed for desktop use. A mobile companion is planned for Phase 2."
- No Enter Demo button

## 3.2 Screen 2 — Rule Setup

**Page:** `03 · S2 Rule Setup`

**Shell state:** 
- Sidebar visible but ALL tabs disabled except "Rules" (use `Sidebar/Active-Rules` variant with others `wf/text-muted`)
- Top Bar visible with $52,840 balance, 0% bars
- Order Panel: `OrderPanel/Disabled-S2` variant

**Main content:**
```
┌──────────────────────────────────────────────────┐
│ SET YOUR RULES                                   │  ← text/heading-lg
│                                                  │
│ Paste your prop firm's rules below — straight    │  ← text/body, max-width 600px
│ from their website or PDF. The platform will     │
│ read them and enforce them on every trade you    │
│ attempt.                                         │
│                                                  │
│ Prop firm rules change regularly — verify your   │  ← text/label, text-muted, italic
│ current rules before each new challenge phase.   │
│                                                  │
│ ┌──────────────────┐   ┌──────────────────┐     │  ← two 440×280 cards side by side, 24px gap
│ │ OPTION A         │   │ OPTION B         │     │
│ │                  │   │                  │     │
│ │ Use a preset     │   │ Paste your       │     │
│ │ (demo)           │   │ firm's rules     │     │
│ │                  │   │                  │     │
│ │ Demo Firm —      │   │ ┌──────────────┐ │     │
│ │ Standard         │   │ │ (disabled    │ │     │
│ │ Evaluation       │   │ │  textarea)   │ │     │
│ │                  │   │ └──────────────┘ │     │
│ │                  │   │                  │     │
│ │ [ Select ]       │   │ [Coming in full  │     │  ← Option B card: opacity 0.5,
│ │                  │   │  version]        │     │    badge instead of button
│ └──────────────────┘   └──────────────────┘     │
└──────────────────────────────────────────────────┘
```

**Create a second frame** labeled "S2 — After Preset Selected" showing the confirmation card:
```
┌──────────────────────────────────────────────────┐
│ SET YOUR RULES                                   │
│                                                  │
│ ┌────────────────────────────────────────────┐   │
│ │ Demo Firm — Standard Evaluation            │   │  ← Card/Default, 24px padding
│ │ Last verified: April 6, 2026               │   │
│ │                                            │   │
│ │ ✓ Max risk per trade        2%             │   │  ← All 8 rules enumerated
│ │ ✓ Daily loss limit          5%             │   │
│ │ ✓ Overall drawdown          10% trailing   │   │
│ │ ✓ Stop-loss required        Mandatory      │   │
│ │ ✓ News window               2 min ±        │   │
│ │ ✓ Consistency score         Max 30%        │   │
│ │ ✓ Minimum trading days      10             │   │
│ │ ✓ Demo account balance      $52,840        │   │
│ │                                            │   │
│ │ [ Confirm Rules and Continue ]             │   │  ← full-width, Active-Green
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**Create a third frame** labeled "S2 — Staleness Gate" showing the 30-day block:
- Non-dismissible `Banner/Staleness` at top of main content
- Background cards greyed out (opacity 0.4)
- Banner copy: "Your rule set is 30+ days old. Verify your firm's current rules before proceeding."
- Re-confirm button in banner

## 3.3 Screen 3 — Execution Dashboard

**Page:** `04 · S3 Dashboard`

**Shell state:** All sidebar tabs active, "Dashboard" highlighted. Order Panel: `OrderPanel/Disabled-S2` (Trade not initiated yet, show a hint like "Click 'New Trade +' to begin").

**Main content — 4 blocks in vertical stack:**

```
┌──────────────────────────────────────────────────┐
│ BLOCK 1 — Account Status (in Top Bar already)   │  ← handled by Top Bar component
├──────────────────────────────────────────────────┤
│ BLOCK 2 — Active Rules                           │
│ ┌────────────────────────────────────────────┐   │
│ │ ACTIVE RULES       Last verified: Apr 6    │   │  ← Card/Default, 16px padding
│ │ ✓ Max risk 2%      ✓ Daily loss 5%         │   │
│ │ ✓ Drawdown 10%     ✓ Stop-loss required    │   │
│ │ ✓ News window 2min ✓ Consistency 30%       │   │
│ │ ✓ Min days 10      ✓ Balance $52,840       │   │
│ │                                            │   │
│ │ Next news: EUR/USD in 2h 14m               │   │
│ │ Trading days completed: 0 / 10             │   │
│ └────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│ BLOCK 3 — Open Positions                         │
│ ┌────────────────────────────────────────────┐   │
│ │ OPEN POSITIONS                             │   │
│ │                                            │   │
│ │           No open positions.               │   │  ← empty state, centered
│ │                                            │   │
│ └────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│ BLOCK 4 — New Trade CTA                          │
│         [       + New Trade       ]              │  ← Button/Primary/Active-Green,
│                                                  │     full-width or 400px centered
└──────────────────────────────────────────────────┘
```

**Create 3 additional S3 frame variants:**

1. **"S3 — With Open Position"** — Block 3 populated with one row:
   ```
   EUR/USD  |  Long ↗  |  Entry 1.08547  |  P&L +$124.50  |  Risk $794  |  SL 20 pips
   ```

2. **"S3 — Amber Warning (85% daily loss)"** — 
   - Top Bar progress bars amber
   - `Banner/Warning` above main content: "Approaching daily loss limit — 15% remaining."

3. **"S3 — Daily Loss Reached"** —
   - Top Bar red
   - `Banner/Blocked` at top: "Daily loss limit reached. No new trades today."
   - New Trade button `Disabled` variant

## 3.4 Screen 4 — Instrument & Direction

**Page:** `05 · S4 Instrument & Direction`

**Shell state:** Sidebar "Trade" highlighted. Order Panel: `OrderPanel/Step-1`.

**Main content** — a simple chart area placeholder and price header:

```
┌──────────────────────────────────────────────────┐
│  EUR/USD                             [chart]     │  ← Instrument name + timeframe
│  1.08546   +0.0003 (+0.03%)          controls    │     text/mono-bold
├──────────────────────────────────────────────────┤
│                                                  │
│                                                  │
│                                                  │
│           [ Chart Placeholder ]                  │  ← large wf/placeholder box
│           (diagonal stripes)                     │     600×400, centered
│                                                  │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

The interactive selection happens in the Order Panel (Step 1 variant already covers this).

## 3.5 Screen 5 — Risk & Stop Loss

**Page:** `06 · S5 Risk & Stop Loss`

**Shell state:** Sidebar "Trade" highlighted. Order Panel cycles through variants below.

**Main content:** Same chart placeholder as S4, dimmed slightly (`wf/bg` overlay at 20% opacity) to emphasize the Order Panel as the active area.

**Main S5 frame:** Uses `OrderPanel/Step-2-Empty`.

## 3.6 S5 Gatekeeper States (all variants on one page)

**Page:** `07 · S5 Gatekeeper States`

This is a CRITICAL reference page. Create 16 frames side-by-side in a grid (4 columns × 4 rows, or 3 × 6), each showing the full 1440×900 shell with a different Order Panel state. Row 5 now includes the TC 10.6 soft-block variant:

**Row 1 — Base states:**
1. `S5 / Neutral — No input yet` (OrderPanel/Step-2-Empty)
2. `S5 / All Clear — 2% Risk + SL` (OrderPanel/Step-2-Filled-AllClear)
3. `S5 / All Clear + TP (R:R 1:2)` — same + TP field filled

**Row 2 — Single Blocked states:**
4. `S5 / Blocked — Risk 3% exceeds limit` (GatekeeperBar/Blocked-Risk-Limit)
5. `S5 / Blocked — No Stop Loss` (GatekeeperBar/Blocked-No-StopLoss)
6. `S5 / Blocked — Daily Loss 100%` (GatekeeperBar/Blocked-Daily-Loss)

**Row 3 — More Blocked states:**
7. `S5 / Blocked — News Window (countdown)` (GatekeeperBar/Blocked-News)
8. `S5 / Blocked — Fee-Adjusted Risk Breach` (GatekeeperBar/Blocked-Fee-Adjusted)
9. `S5 / Blocked — Multiple Violations` (GatekeeperBar/Blocked-Multiple)

**Row 4 — Drawdown + Warnings:**
10. `S5 / Blocked — Overall Drawdown Reached` (GatekeeperBar/Blocked-Drawdown)
11. `S5 / Warning — Drawdown Proximity (88%)` (AllClear + Warning-Drawdown-Proximity)
12. `S5 / Warning — Consistency Score (25%)` (AllClear + Warning-Consistency) — TC 10.2

**Row 5 — Soft block + remaining warnings + Exit modal:**
13. `S5 / Soft Block — Consistency Score at 30%` (GatekeeperBar/SoftBlock-Consistency + two-button override) — **TC 10.6 (NEW)**
14. `S5 / Warning — News in 22 min` (AllClear + Warning-News-Proximity)
15. `S5 / Warning — Day Qualification at Entry` (AllClear + Warning-Day-Qualification-Entry)
16. `S5 / Modal — Day Qualification at Exit` — this is different: it's a modal popup over S3 (Dashboard), triggered when closing a position. Draw the full Dashboard with a modal dialog overlay.

**For soft block variant 13 (TC 10.6):**
```
[Order Panel with inputs filled · R:R 1:3 · TP aggressive]

┌────────────────────────────────────────────┐
│ ⚠  Soft block · Consistency score          │  ← signal/amber-bg, amber outline
│    threshold                               │     (denser than warning — signals
│                                            │      "block with override")
│    Executing this trade at your current    │
│    target would push your consistency      │
│    score to 31%. Your maximum is 30% —     │
│    exceeding it may disqualify your        │
│    payout. Adjust your target or proceed   │
│    knowing the risk.                       │
└────────────────────────────────────────────┘

┌─────────────────┬──────────────────────────┐
│ Adjust target   │    Execute anyway        │  ← two-button override row
│   (ghost)       │      (filled)            │     Continue is disabled
└─────────────────┴──────────────────────────┘     until one is tapped

[ Back ]                           [ Continue (disabled) ]
```

**Soft block flow spec (TC 10.6):**
- **Preconditions:** Valid inputs, R:R 1:3, TP set. Projected consistency ≥ 30% (mock: 31%, prior profits at 29% of total).
- **Default state:** Amber soft block overlay; Continue disabled. "Execute anyway" is filled but NOT the default action — it requires an explicit tap.
- **Branch 2a — Adjust target:** Returns to S5 (warning/all-clear depending on new TP). TP field is highlighted and focused. Gatekeeper resets and recalculates live as the trader edits.
- **Branch 2b — Execute anyway:** Soft block acknowledged. Gatekeeper transitions to green "All clear." Continue enabled. Trade proceeds to S6. **Conscious override is logged** for audit / payout review.

**For the exit modal (variant 15):**
```
[Dashboard visible, dimmed at 40% opacity overlay]

                  ┌────────────────────────┐
                  │ ⚠ Day Qualification    │  ← modal card, 480×280 centered
                  │                        │     signal/amber-bg top border
                  │ Closing here (+0.9%)   │
                  │ will not count as a    │
                  │ valid trading day —    │
                  │ minimum gain required  │
                  │ is 1.0%.               │
                  │                        │
                  │ [Close Anyway] [Keep]  │  ← two buttons
                  └────────────────────────┘
```

## 3.7 Screen 6 — Review & Confirm

**Page:** `08 · S6 Review & Confirm`

**Shell state:** Sidebar "Trade" highlighted. Order Panel: `OrderPanel/Step-3-Review`.

**Main content:** Continue to show the dimmed chart (same as S5) — the action is in the Order Panel.

**Create 2 variants:**
1. `S6 / All Clear — Ready to Execute` — Execute button active green
2. `S6 / Rule Changed Mid-Review (News Activated)` — Gatekeeper bar now red, Execute disabled

## 3.8 Screen 7 — Post-Execution

**Page:** `09 · S7 Post-Execution`

**Shell state:** Sidebar "Trade" highlighted. Order Panel collapses/simplifies (or use `OrderPanel/Disabled-S2` style) to emphasize main content.

**Main content — full-width comparison card:**
```
┌────────────────────────────────────────────────────┐
│  ✓ Trade Executed                                  │  ← text/heading-lg
├────────────────────────────────────────────────────┤
│                                                    │
│                 Requested   Estimated   Actual     │  ← 3-column table
│   Entry         1.08542     1.08544     1.08547    │
│   Risk ($)      $1,056.80   $1,058.20   $1,059.80  │
│   Size          5.28 lots   5.28 lots   5.28 lots  │
│   Slippage      —           —           +0.5 pips  │  ← signal/amber-bg on this row
│                                                    │
│   Slippage: +0.5 pips — Your fill was 0.5 pips     │  ← explanation, amber text
│   worse than requested. This is normal in live     │
│   markets.                                         │
│                                                    │
├────────────────────────────────────────────────────┤
│  [ View in Journal ]      [ New Trade ]            │
└────────────────────────────────────────────────────┘
```

**Create 1 variant:** `S7 / No Slippage` — Slippage row with green bg, copy: "No slippage. Fill matched your requested price."

## 3.9 Screen 8 — Trade Journal

**Page:** `10 · S8 Trade Journal`

**Shell state:** Sidebar "Journal" highlighted. Order Panel disabled (as in S2).

**Main content — auto-populated entry:**
```
┌────────────────────────────────────────────────────┐
│  TRADE JOURNAL                                     │
│                                                    │
│  ℹ Your trade was logged automatically. You didn't │  ← first-time message card,
│     have to do anything. [×]                       │     signal/green-bg, dismissible
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  Trade #001        Apr 6, 2026 · 14:23       │  ← journal entry card
│  │                                              │  │
│  │  Instrument      EUR/USD                     │  │  ← label-value rows
│  │  Direction       Long ↗                      │  │
│  │  Entry           1.08547                     │  │
│  │  Stop Loss       1.08342                     │  │
│  │  Take Profit     1.08942                     │  │
│  │  Requested Risk  $1,056.80                   │  │
│  │  Actual Risk     $1,059.80                   │  │
│  │  Position Size   5.28 lots                   │  │
│  │  R : R           1:2.00                      │  │
│  │  Rule Status     ● All Clear                 │  │
│  │  Slippage        +0.5 pips                   │  │
│  │  Outcome         Pending                     │  │
│  │  ─────────────────────────────────────────   │  │
│  │  Tags     [+ Add tag]                        │  │  ← editable section
│  │  Notes    [empty textarea]                   │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  [ Back to Dashboard ]                             │
└────────────────────────────────────────────────────┘
```

**Create 1 variant:** `S8 / Empty State` — no entries, centered text "No trades logged yet. Complete your first trade to see it here."

---

# Part 4 — Execution Order

Execute in this sequence using Figma MCP tools:

```yaml
step_1:
  action: "Create file and all 10 pages"
  tools: [figma_create_file, figma_create_page]

step_2:
  action: "On page 01 · Tokens & Components — create all color styles and text styles"
  tools: [figma_create_color_style, figma_create_text_style]
  verify: "List styles and confirm all tokens from Part 1.3 and 1.4 exist"

step_3:
  action: "Build components 2.1 through 2.9 on page 01"
  tools: [figma_create_component, figma_create_variant]
  verify: "Components page has labeled sections for each component with variants"

step_4:
  action: "For each screen S1-S8, create primary frame using components"
  tools: [figma_create_frame, figma_instance_component]
  order: [S1, S2, S3, S4, S5, S6, S7, S8]

step_5:
  action: "Create Gatekeeper states grid on page 07"
  tools: [figma_create_frame, figma_instance_component]
  note: "This is the largest single page — 16 frames (13 inline states, 1 soft-block with override row, 2 modal/warning variants)"

step_6:
  action: "Create secondary variants (empty states, blocked banners, modals)"
  tools: [figma_create_frame]
  reference: "Sections 3.2-3.9 list all variant frames required"

step_7:
  action: "Verify completeness"
  checklist:
    - "All 10 pages exist and named correctly"
    - "Color/text styles match Part 1.3/1.4 exactly"
    - "All component variants from Part 2 exist"
    - "All primary screen frames exist"
    - "All 15 Gatekeeper state frames on page 07"
    - "All secondary variants (mobile fallback, after-preset, staleness gate, etc.)"
```

---

# Part 5 — Quality Guardrails

Before marking this complete, verify:

- **No color outside the token set** — grep for any hex values not in `wf/*` or `signal/*`
- **No real iconography** — only the 6 allowed primitives (↗ ↘ + × ● ✓). If more are needed, use grey boxes as icon placeholders
- **Exact copy from PRD** — every text string in Gatekeeper states must match the PRD verbatim (these are legal commitments in the SOW)
- **Consistent grid** — all screens use 1440×900, Shell is pixel-identical across screens
- **Order Panel visibility** — present on every screen from S3 onward; disabled on S2; absent on S1
- **No clickable connections** — this is static-frame only per requirements

---

# Reference — Copy strings bank (use verbatim)

All Gatekeeper messages, button labels, and headers must match these strings character-for-character. Do not paraphrase.

**Gatekeeper — Blocked:**
- "ALL CLEAR — All rules satisfied. Proceed to review."
- "Risk limit is 2% per trade — you've entered 3.00%. Reduce your risk to proceed."
- "No stop-loss set. A stop-loss is required before this trade can exist."
- "Daily loss limit reached. You have used 100% of your $2,500 daily allowance. No new trades today."
- "News restriction active. High-impact EUR/USD news in 1 minute. Trading resumes at 14:32."
- "Fee-adjusted risk would exceed your 2% limit. After accounting for broker spread and commission, this trade costs 2.18%. Reduce your position or widen your stop to proceed."
- "Risk limit exceeded (3.00% — max 2%). No stop-loss set. Fix both to proceed."
- "Maximum trailing drawdown reached. You have used 100% of your 10% drawdown allowance ($5,284). No further trading is permitted."

**Gatekeeper — Warning:**
- "Approaching daily loss limit — you have used 88% of your daily allowance. 12% remaining."
- "Letting this trade run to your target would exceed your consistency score ratio. Consider closing at 1:2 instead of 1:3."
- "High-impact news in 22 minutes. Ensure your position is managed before 14:32."
- "Day qualification: your target of +0.9% does not meet the minimum gain required for this day to count (1.0% required)."
- "Closing here (+0.9%) will not count as a valid trading day — minimum gain required is 1.0%. If you close now, today does not count toward your challenge. Hold to target or accept the consequence."

**Core button labels:**
- "Enter Demo" · "Confirm Rules and Continue" · "+ New Trade" · "Continue" · "Back" · "Execute Long" · "Execute Short" · "View in Journal" · "New Trade" · "Back to Dashboard" · "Close Anyway" · "Keep Open" · "Re-confirm current rules"

**Screen headers:**
- "Trade the right way. No real money required." (S1)
- "Set Your Rules" (S2)
- "Trade Executed ✓" (S7)

---

**End of prompt.** Begin execution at Part 1.
