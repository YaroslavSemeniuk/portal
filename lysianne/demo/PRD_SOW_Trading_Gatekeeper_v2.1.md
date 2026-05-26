# Trading Gatekeeper Platform — PRD & Statement of Work

| Version | Date | Status | Mode |
|---------|------|--------|------|
| 2.1 | 06 Apr 2026 | Pending Approval | Demo Only (V1) |

---

## 0. Scope Agreement

### 0.1 In Scope

| # | Deliverable | Acceptance Criteria |
|---|-------------|---------------------|
| D1 | **Demo Entry Screen (S1)** | Single click "Enter Demo" → transition to S2 |
| D2 | **Rule Setup Screen (S2)** | Preset + Copy-Paste parsing → Confirm → Lock |
| D3 | **Execution Dashboard (S3)** | Live risk status, progress bars, open positions |
| D4 | **Order Entry — 4-step flow (S4–S7)** | Instrument → Risk → Review → Execute → Truth Display |
| D5 | **Rule Gatekeeper Engine** | 7 blocked states + 5 warning states, real-time |
| D6 | **Trade Journal (S8)** | Auto-populated entry, zero manual input |
| D7 | **Navigation & 3-Panel Layout** | Sidebar + Main + Order Panel, persistent |
| D8 | **Demo Firm Preset** | Pre-loaded ruleset "Demo Firm — Standard Evaluation" |

### 0.2 Out of Scope

Real broker API, mobile version, advanced charting, prop firm dashboard, settings/account management, onboarding tutorial, multiple broker integrations, user authentication.

### 0.3 Definition of Done

> Each Test Case (TC) below is an **independent acceptance unit**. A Deliverable is considered accepted when **all TCs belonging to it pass** against the "Expected System Response" column without discrepancies.

### 0.4 Design System (Global)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | **#0F0F0F** | Main app background |
| `--bg-secondary` | **#1A1A1A** | Cards, panels, order entry area |
| `--bg-tertiary` | **#2D2D2D** | Input fields, secondary surfaces |
| `--bg-gradient-start` | **#0A0E17** | Subtle background gradient (optional) |
| `--bg-gradient-end` | **#111820** | Subtle background gradient (optional) |
| `--text-primary` | **#FFFFFF** | Main text, prices, key numbers |
| `--text-secondary` | **#888888** | Supporting text, inactive elements |
| `--accent-green` | **#00C853** | All Clear, Execute, positive P&L |
| `--accent-red` | **#D50000** | Blocked states, negative P&L |
| `--accent-amber` | **#FF6D00** | Warning states |
| `--border` | **#2D2D2D** | Tables, card dividers |
| `--font` | **Inter** | Regular 400 · Medium 500 · Bold 700 |

### 0.5 Layout Constraints (Global)

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOP BAR  height: 40px  │  DEMO MODE banner │ Balance │ P&L │ Bars │
├───────────┬─────────────────────────────────┬───────────────────────┤
│  SIDEBAR  │        MAIN CONTENT             │    ORDER PANEL        │
│  w: 200px │        w: fluid (min 920px)     │    w: 320px fixed     │
│  fixed    │                                 │    always visible     │
│           │                                 │                       │
│  Tabs:    │  Renders: S3 / S4-S7 / S8 / S2 │  Trade entry,         │
│  Dash     │  based on active tab            │  risk input,          │
│  Trade    │                                 │  gatekeeper bar,      │
│  Journal  │                                 │  execute button       │
│  Rules    │                                 │                       │
└───────────┴─────────────────────────────────┴───────────────────────┘
```

> **The Right Order Panel is ALWAYS visible** — this is the key differentiator from MT5. It never hides on any screen.

### 0.6 Demo Account Constants

| Parameter | Value |
|-----------|-------|
| Starting Balance | **$52,840.00** |
| Commission | **$3.50** per lot per side |
| EUR/USD Spread | ~1.2 pips |
| GBP/USD Spread | ~1.8 pips |
| Simulated Slippage | 0–1.5 pips (random) |
| Simulated Fill Delay | ~200ms UI delay |

---

## Screen 1 — Demo Entry

**Deliverable:** D1  
**Epic:** Onboarding — zero-barrier platform entry

### Flow 1: Entering Demo Mode

#### TC 1.1 — Successful Demo Mode Entry ✅ HAPPY PATH

*First-time user sees the platform, understands it is Demo, enters with a single click.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Opens the platform URL | — | S1 loads. Centered layout: logo, headline, CTA. | Logo/wordmark centered. Headline: "Trade the right way. No real money required." Sub-text below. Single button "Enter Demo". Below button: "No real trades. No broker required. Rules run live." |
| 2 | Clicks "Enter Demo" | — | Transition to S2 (Rule Setup). Session initialized. | URL changes. S2 renders. Sidebar, Top Bar, Order Panel become visible. |

#### TC 1.2 — Opening on a Mobile Device ⬜ EDGE CASE

*Platform is desktop-only (V1). Mobile traffic receives an informational message.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Opens URL from mobile | viewport < 1024px | Informational screen shown instead of S1. | Text: "This platform is designed for desktop use. A mobile companion is planned for Phase 2." No "Enter Demo" button. |

---

## Screen 2 — Rule Setup

**Deliverable:** D2, D8  
**Epic:** Rule Engine — loading and locking rules for the session

### Flow 2: Loading Rules via Preset

#### TC 2.1 — Successful Demo Firm Preset Load ✅ HAPPY PATH

*User selects a ready-made preset, sees all 8 rules, confirms, proceeds to Dashboard. Right Order Panel is visible but inactive until rules are confirmed.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Sees S2 after entry | — | Header: "Set Your Rules". Two cards: Option A (Preset) and Option B (Paste). Option B displays a label: "Coming in full version" and is non-interactive. | Option A clickable. Option B visible but disabled/greyed with "Coming in full version" badge. Right Order Panel is visible but fully disabled — all inputs inactive, no gatekeeper status, muted appearance — until rules are confirmed. |
| 2 | Clicks Option A: "Use a preset (demo)" | — | "Demo Firm — Standard Evaluation" loads. Confirmation card displays all 8 rules: (1) Max risk per trade: 2%, (2) Daily loss limit: 5%, (3) Overall drawdown: 10% trailing, (4) Stop-loss required: mandatory, (5) News window: 2 min before/after, (6) Consistency score: max 30%, (7) Minimum trading days: 10, (8) Demo account balance: $52,840. Date: "Last verified: [today]". | All 8 rules visible in structured form with values. Each rule has a green checkmark. CTA: "Confirm Rules and Continue". |
| 3 | Clicks "Confirm Rules and Continue" | — | Rules locked. Right Order Panel activates (inputs become enabled, gatekeeper bar appears). Transition to S3. | Rules immutable for session. "Rules" tab shows locked rules (read-only). Order Panel transitions from disabled to active state. |

### Flow 3: Loading Rules via Copy-Paste

> **Prototype Scope Note:** The copy-paste rule parsing flow (Option B) will **not** be functional in this prototype build. The Rule Setup screen will display both Option A (preset) and Option B (paste your firm's rules), but only Option A will be interactive. Option B will be visible and marked "Coming in full version" so test users understand the feature exists and is planned. TC 3.1–3.3 are retained below as future reference for the full product build.

#### TC 3.1 — Successful Parsing of Pasted Text `DEFERRED — Full Version`

*User pastes rule text, parser recognizes all parameters, user confirms.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Clicks Option B: "Paste your firm's rules" | — | Textarea opens + "Parse Rules" button. | Placeholder: "Paste your prop firm's rules here..." Parse disabled if empty. |
| 2 | Pastes rule text | "Max risk: 1.5% per trade. Daily loss limit: 4%. Trailing drawdown: 8%. Stop-loss mandatory. No trading 3 min before/after news." | Clicks "Parse Rules". Confirmation card with parsed rules. | Parsed: max_risk=1.5%, daily_loss=4%, drawdown=8%, stop_loss=required, news_window=3min. All green. |
| 3 | Clicks "Confirm Rules and Continue" | — | Rules locked. Transition to S3. | Identical to TC 2.1 Step 3. |

#### TC 3.2 — Parser Did Not Recognize Some Rules `DEFERRED — Full Version`

*Some rules unrecognized — user sees a warning and can add them manually.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Pastes incomplete text | "Risk limit 2%. Stop loss required." | Parser recognizes max_risk and stop_loss. Rest — "Could not detect". | Recognized: green checkmark. Unrecognized: amber + "Could not detect — this rule will not be enforced. You can add it manually." |
| 2 | Clicks "Add manually" | daily_loss = 5% | Field updates. Rule marked manually added. | Checkmark turns green. Label: "(manually added)". |
| 3 | Clicks "Confirm Rules and Continue" | — | Rules locked. Transition to S3. | All confirmed rules enforced by Gatekeeper. |

#### TC 3.3 — Empty Textarea on Parse Click `DEFERRED — Full Version`

*Edge case — user clicks Parse with no input.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Focus on textarea, types nothing | textarea = "" | "Parse Rules" button disabled. | Button: opacity 0.4, cursor not-allowed. |
| 2 | Types fewer than 10 characters | "risk 2" | Button remains disabled. | Tooltip: "Please paste a complete rule set (minimum 10 characters)." |

### Flow 4: Rule Staleness Protection

#### TC 4.1 — Rules Older Than 30 Days — Blocked 🔴 BLOCKED

*Rules not re-confirmed within 30+ days block access to trading.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Opens platform with saved rules | confirmed_at = 36 days ago | Non-dismissible banner: "Your rule set is 30+ days old. Verify your firm's current rules before proceeding." | Banner: amber bg, full-width, cannot be closed. |
| 2 | Attempts to navigate to Dashboard | — | Blocked. Must re-confirm or update rules. | Dashboard / Trade / Journal tabs disabled. Only Rules active. |
| 3 | Clicks "Re-confirm current rules" | — | confirmed_at updated. Banner disappears. | All tabs active. "Last verified: [today]". |

---

## Screen 3 — Execution Dashboard

**Deliverable:** D3  
**Epic:** Session Monitoring — live risk overview and trade initiation

### Flow 5: Viewing Account Status

#### TC 5.1 — Dashboard in Starting State (Empty) ✅ HAPPY PATH

*First entry after rule confirmation. No open positions, no trades.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Arrives at S3 after confirming rules | Balance: $52,840. P&L: $0. Loss: 0%. Drawdown: 0%. | Four blocks displayed. Progress bars green (0%). Open Positions: empty. "New Trade +" active. | Block 1: Account Status. Block 2: Active Rules + checkmarks + news countdown. Block 3: "No open positions." Block 4: "New Trade +" green button. |

#### TC 5.2 — Dashboard with Daily Loss Limit Warning ⚠️ WARNING

*Trader has used 85% of the daily loss limit — amber banner.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Returns to Dashboard | Daily loss: 85% | Amber banner: "Approaching daily loss limit." Progress bar amber. "New Trade +" remains active. | Banner: amber. Bar: amber 85%. Button active. |

#### TC 5.3 — Dashboard with Daily Loss Limit Reached 🔴 BLOCKED

*100% daily limit — "New Trade" button blocked.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Returns to Dashboard | Daily loss: 100% | Red banner: "Daily loss limit reached. No new trades today." Button disabled. | Button greyed out. Banner: red. |
| 2 | Attempts to click "New Trade +" | — | Nothing happens. | Tooltip: "Daily loss limit reached." |

### Flow 6: Initiating a New Trade

#### TC 6.1 — Clicking "New Trade +" → Order Entry ✅ HAPPY PATH

*Happy path — button active, transition to S4.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Clicks "New Trade +" | daily_loss < limit | Transition to S4. Step indicator "1 of 4". | Main → S4. Order Panel → Step 1. Sidebar "Trade" highlighted. |

---

## Screen 4 — Order Entry: Instrument & Direction

**Deliverable:** D4 (Step 1/4)  
**Epic:** Core Execution

### Flow 7: Selecting Instrument and Direction

#### TC 7.1 — Selecting EUR/USD Long ✅ HAPPY PATH

*Happy path — default instrument, Long direction.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Sees S4 | — | Header: "New Trade", Step "1 of 4". Dropdown = EUR/USD. Live bid/ask. | Bid: 1.08540, Ask: 1.08552. Long/Short buttons inactive. |
| 2 | Clicks "Long ↗" | — | Long highlighted green. Transition to S5. | Long: green tint. Step → "2 of 4". |

#### TC 7.2 — Selecting GBP/USD Short ✅ HAPPY PATH

*Alternative path — different instrument, Short direction.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Types "GBP" in search | — | Filter shows GBP/USD, EUR/GBP. | Dropdown filtered. |
| 2 | Selects GBP/USD | — | Bid/Ask updates. | Bid: 1.26340, Ask: 1.26358. Spread: 1.8 pips. |
| 3 | Clicks "Short ↘" | — | Short highlighted red. Transition to S5. | Short active. Direction = "short". |

#### TC 7.3 — Search with No Results ⬜ EDGE CASE

*Entered text does not match any instrument.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Types "XYZ" | — | "No instruments matching your search." | Long/Short disabled. |

---

## Screen 5 — Order Entry: Risk & Stop Loss

**Deliverable:** D4 (Step 2/4), D5  
**Epic:** Core Execution + Rule Gatekeeper

### Flow 8: Risk and Stop Loss Input (Happy Path)

#### TC 8.1 — Valid Input — 2% Risk, SL Set, All Clear ✅ HAPPY PATH

*Trader enters parameters within rules. Gatekeeper = All Clear.*

> **Core Logic Clarification:** When fee-inclusive risk (spread + commission) would exceed the 2% limit, the platform automatically reduces the position size to keep the total all-in cost within the cap. The trader enters their desired risk percentage; the system calculates the maximum position size that stays within that limit after all fees. The platform does not flag the overage after sizing — it prevents it by adjusting lots downward before presenting the calculated output.

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Sees S5 | Risk mode: % | Step "2 of 4". Toggle, empty inputs, Gatekeeper neutral. Continue disabled. | Gatekeeper bar grey: "Enter trade parameters." |
| 2 | Enters Risk = 2.00% | Risk: 2.00 | Dollar Risk ≈ $1,056.80 (incl. fees). Gatekeeper RED: no SL. Continue disabled. | Dollar equivalent shown. Gatekeeper red. |
| 3 | Enters SL = 1.08342 | SL: 20 pips | Position Size ≈ 5.28 lots. Gatekeeper: **"ALL CLEAR"**. Continue enabled. | Gatekeeper green. Continue active. |
| 4 | Enters TP = 1.08942 (optional) | TP: 40 pips | R:R = 1:2.00. Day Qualification: "Qualifies". | Green text for Day Qualification. |
| 5 | Clicks Continue | — | Transition to S6. | Step → "3 of 4". |

### Flow 9: Gatekeeper — Blocked States

#### TC 9.1 — Blocked: Risk Limit Exceeded (3% > 2%) 🔴 BLOCKED

*Trader enters 3% risk. Gatekeeper blocks execution.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Enters Risk = 3.00% | SL set | RED: "1 RULE PREVENTING EXECUTION: Risk limit is 2% per trade — you've entered 3.00%. Reduce your risk to proceed." Continue disabled. | Bar red. Dollar Risk ≈ $1,585.20. |

#### TC 9.2 — Blocked: No Stop-Loss 🔴 BLOCKED

*Valid risk but SL empty.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Risk = 2.00%, SL empty | SL = null | RED: "No stop-loss set. A stop-loss is required before this trade can exist." Continue disabled. | SL input highlighted red. |

#### TC 9.3 — Blocked: Daily Loss Limit Reached 🔴 BLOCKED

*Daily loss at 100%.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Reaches S5 | daily_loss = 100% | RED: "Daily loss limit reached. You have used 100% of your $2,500 daily allowance. No new trades today." All inputs disabled. | Full bar red. |

#### TC 9.4 — Blocked: News Window Active 🔴 BLOCKED

*High-impact news within restricted window.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | EUR/USD, valid params | News in 1 min | RED: "News restriction active. High-impact EUR/USD news in 1 minute. Trading resumes at 14:32." Live countdown. | Timer updates every second. |

#### TC 9.5 — Blocked: Fee-Adjusted Risk Breach 🔴 BLOCKED

*Raw risk within limit but fees push total over threshold.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Risk = 2.00%, SL tight (5 pips) | Fee-inclusive = 2.18% | RED: "Fee-adjusted risk would exceed your 2% limit. After accounting for broker spread and commission, this trade costs 2.18%. Reduce your position or widen your stop." | Dollar Risk shows fee-inclusive amount. |

#### TC 9.6 — Blocked: Multiple Violations 🔴 BLOCKED

*Two or more rules violated simultaneously.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Risk = 3.00%, SL = null | — | RED: "2 RULES PREVENTING EXECUTION: Risk limit exceeded (3.00% — max 2%). No stop-loss set. Fix both to proceed." | Count: "2 RULES". Both listed. |

#### TC 9.7 — Blocked: Overall Trailing Drawdown Reached 🔴 BLOCKED

*Account equity has breached the 10% trailing drawdown limit. All trading activity is blocked for the session.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Attempts any trade action | Peak balance: $52,840. Current balance: $47,556 (drawdown = 10.0%) | RED: "Maximum trailing drawdown reached. You have used 100% of your 10% drawdown allowance ($5,284). No further trading is permitted." All trade inputs disabled. "New Trade +" disabled on Dashboard. | Full bar red. All inputs disabled across S3–S6. Dashboard shows red banner: "Maximum drawdown reached. Session ended." No recovery possible within this session. |

### Flow 10: Gatekeeper — Warning States

#### TC 10.1 — Warning: Drawdown Proximity ⚠️ WARNING

*Trade valid but daily loss usage is approaching the limit.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Valid input (1.5%, SL set) | daily_loss_used = 88% | GREEN "All Clear" + AMBER: "Approaching daily loss limit — you have used 88% of your daily allowance. 12% remaining." Continue **enabled**. | Dual state: green status + amber warning below. Trader CAN proceed. |

#### TC 10.2 — Warning: Consistency Score ⚠️ WARNING

*Trade target may violate the consistency ratio.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Valid input, R:R 1:3 | Previous small P&L trades | AMBER: "Letting this trade run to your target would exceed your consistency score ratio. Consider closing at 1:2 instead of 1:3." Continue enabled. | Warning below All Clear. |

#### TC 10.3 — Warning: News Proximity (22 min) ⚠️ WARNING

*News approaching but not yet within restricted window.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Valid input | News in 22 min | AMBER: "High-impact news in 22 minutes. Ensure your position is managed before 14:32." Continue enabled. | Countdown in warning. |

#### TC 10.4 — Warning: Day Qualification at Entry ⚠️ WARNING

*Trade target does not meet minimum gain for the day to count.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Risk 1%, TP small | Projected +0.9% | AMBER: "Day qualification: your target of +0.9% does not meet the minimum gain required (1.0%). Adjust or proceed knowing this day will not count." | Day Qualification: amber "Does not qualify". |

#### TC 10.5 — Warning: Day Qualification at Exit ⚠️ WARNING

*Warning when closing a position below minimum gain threshold.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Clicks "Close Position" | P&L = +0.9% | AMBER popup: "Closing here (+0.9%) will not count as a valid trading day — minimum 1.0% required." Buttons: "Close Anyway" / "Keep Open". | Modal with amber border. Two buttons. |

### Flow 11: Blocked-to-Valid Recovery

#### TC 11.1 — Trader Fixes Risk from 3% to 1.5%, Adds SL → All Clear 🔵 RECOVERY

*Key "fix-and-proceed" scenario. Trader triggers block, understands cause, corrects, continues.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Risk = 3.00%, SL empty | — | RED: "2 RULES: Risk limit exceeded. No stop-loss set. Fix both." Continue disabled. | 2 violations listed. |
| 2 | Changes Risk to 1.50% | — | Updates to "1 RULE: No stop-loss set." Continue disabled. | Count drops 2 → 1. Risk recalculated. |
| 3 | Enters SL = 1.08342 | — | GREEN: "ALL CLEAR." Continue **enabled**. | Red → green transition. Fields populated. |
| 4 | Clicks Continue | — | Transition to S6. | Step "3 of 4". |

---

## Screen 6 — Order Entry: Review & Confirm

**Deliverable:** D4 (Step 3/4)  
**Epic:** Core Execution — final confirmation

### Flow 12: Confirming and Executing a Trade

#### TC 12.1 — Successful Confirmation — Execute Long ✅ HAPPY PATH

*All parameters valid, trader confirms and executes.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Sees S6 | EUR/USD Long, Entry 1.08542, SL 1.08342, TP 1.08942, 5.28 lots, $1,056.80, R:R 1:2.00 | Summary card. Disclaimer. Gatekeeper "All Clear ●". "Execute Long" active. "Back" ghost. | Disclaimer: "Estimated risk at stop, including broker spread and commission. Actual outcome may vary due to slippage." |
| 2 | Clicks "Execute Long" | — | Spinner → "Executing..." (~200ms). Transition to S7. | Simulated fill generated. Trade saved. |

#### TC 12.2 — Rule Violated Between S5 and S6 🔴 BLOCKED

*Time-based rule triggers while on Review screen.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | On S6, was All Clear | News window activates | Gatekeeper live update: RED. Execute disabled. | Must wait or go Back. |

---

## Screen 7 — Post-Execution Truth Display

**Deliverable:** D4 (Step 4/4)  
**Epic:** Transparency — showing execution reality

### Flow 13: Truth Display After Execution

#### TC 13.1 — Execution with Slippage ✅ HAPPY PATH

*Fill price differs from requested — slippage highlighted.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Arrives at S7 | Requested: 1.08542, Estimated: 1.08544, Actual: 1.08547, Slippage: +0.5 pips | "Trade Executed ✓". Three-column comparison. Slippage amber. | "+0.5 pips — Your fill was 0.5 pips worse than requested. This is normal in live markets." |
| 2 | Clicks "View in Journal" | — | Transition to S8. | Trade entry pre-populated. |
| 3 | (Alt) Clicks "New Trade" | — | Transition to S4. New flow. | Step resets to "1 of 4". |

#### TC 13.2 — Execution without Slippage ✅ HAPPY PATH

*Fill matches requested price exactly.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Arrives at S7 | Slippage: 0 | "Trade Executed ✓". Green: "No slippage. Fill matched your requested price." | No amber. Green text. |

---

## Screen 8 — Trade Journal

**Deliverable:** D6  
**Epic:** Auto-Journaling — zero-input trade documentation

### Flow 14: Automatic Journal Entry

#### TC 14.1 — First Entry After Execution ✅ HAPPY PATH

*Trade journal auto-populates all fields immediately after execution.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Clicks "View in Journal" on S7 | Trade data | S8 renders. All fields auto-populated. Message: "Your trade was logged automatically. You didn't have to do anything." | Fields: Date/Time, EUR/USD, Long, Entry, SL, TP, Risk, Size, R:R, Status, Outcome "Pending". |
| 2 | Adds tag (optional) | "trend-follow" | Tag saved. | Tag chip appears. |
| 3 | Clicks "Back to Dashboard" | — | Transition to S3. Dashboard updated. | Open Positions shows the new position. |

#### TC 14.2 — Journal in Empty State ⬜ EDGE CASE

*Journal opened before any trades executed.*

| Step | User Action | Mock Data | Expected System Response | UI / Validation |
|------|-------------|-----------|--------------------------|-----------------|
| 1 | Opens Journal tab | trades = [] | "No trades logged yet. Complete your first trade to see it here." | Centered text, no table. |

---

## Appendix A: Prototype Navigation Flows

Three mandatory end-to-end paths for the prototype (Deliverable D4 + D5):

| # | Flow Name | Path | Covers TCs |
|---|-----------|------|------------|
| **P1** | **Valid Trade** | S1 → S2 (TC 2.1) → S3 (TC 5.1) → S4 (TC 7.1) → S5 (TC 8.1) → S6 (TC 12.1) → S7 (TC 13.1) → S8 (TC 14.1) → S3 | 1.1, 2.1, 5.1, 6.1, 7.1, 8.1, 12.1, 13.1, 14.1 |
| **P2** | **Blocked-to-Valid** | S4 (TC 7.1) → S5 (TC 9.6 → TC 11.1) → S6 (TC 12.1) → S7 → S8 | 9.1, 9.2, 9.5, 9.6, 9.7, 11.1, 12.1 |
| **P3** | **Warning State** | S4 (TC 7.1) → S5 (TC 10.1 or 10.4) → S6 (TC 12.1) → S7 → S8 | 10.1, 10.4 |

---

## Appendix B: Acceptance Sign-Off Checklist

| TC ID | TC Name | Status | Signed |
|-------|---------|--------|--------|
| TC 1.1 | Successful Demo Mode Entry | ☐ Pass / ☐ Fail | |
| TC 1.2 | Mobile Device | ☐ Pass / ☐ Fail | |
| TC 2.1 | Demo Firm Preset | ☐ Pass / ☐ Fail | |
| TC 3.1 | Successful Parsing `DEFERRED` | N/A — Prototype | |
| TC 3.2 | Partial Parsing `DEFERRED` | N/A — Prototype | |
| TC 3.3 | Empty Textarea `DEFERRED` | N/A — Prototype | |
| TC 4.1 | Rule Staleness 30+ Days | ☐ Pass / ☐ Fail | |
| TC 5.1 | Dashboard Empty State | ☐ Pass / ☐ Fail | |
| TC 5.2 | Dashboard Amber Warning | ☐ Pass / ☐ Fail | |
| TC 5.3 | Dashboard Daily Loss Hit | ☐ Pass / ☐ Fail | |
| TC 6.1 | New Trade Initiation | ☐ Pass / ☐ Fail | |
| TC 7.1 | EUR/USD Long | ☐ Pass / ☐ Fail | |
| TC 7.2 | GBP/USD Short | ☐ Pass / ☐ Fail | |
| TC 7.3 | Search with No Results | ☐ Pass / ☐ Fail | |
| TC 8.1 | Valid Input — All Clear | ☐ Pass / ☐ Fail | |
| TC 9.1 | Blocked: Risk Limit | ☐ Pass / ☐ Fail | |
| TC 9.2 | Blocked: No Stop-Loss | ☐ Pass / ☐ Fail | |
| TC 9.3 | Blocked: Daily Loss | ☐ Pass / ☐ Fail | |
| TC 9.4 | Blocked: News Window | ☐ Pass / ☐ Fail | |
| TC 9.5 | Blocked: Fee-Adjusted Risk | ☐ Pass / ☐ Fail | |
| TC 9.6 | Blocked: Multiple Violations | ☐ Pass / ☐ Fail | |
| TC 9.7 | Blocked: Overall Trailing Drawdown | ☐ Pass / ☐ Fail | |
| TC 10.1 | Warning: Approaching Daily Loss Limit | ☐ Pass / ☐ Fail | |
| TC 10.2 | Warning: Consistency Score | ☐ Pass / ☐ Fail | |
| TC 10.3 | Warning: News Proximity | ☐ Pass / ☐ Fail | |
| TC 10.4 | Warning: Day Qualification Entry | ☐ Pass / ☐ Fail | |
| TC 10.5 | Warning: Day Qualification Exit | ☐ Pass / ☐ Fail | |
| TC 11.1 | Blocked-to-Valid Recovery | ☐ Pass / ☐ Fail | |
| TC 12.1 | Execute Long | ☐ Pass / ☐ Fail | |
| TC 12.2 | Rule Change Mid-Review | ☐ Pass / ☐ Fail | |
| TC 13.1 | Post-Execution with Slippage | ☐ Pass / ☐ Fail | |
| TC 13.2 | Post-Execution without Slippage | ☐ Pass / ☐ Fail | |
| TC 14.1 | Journal Auto-Populated | ☐ Pass / ☐ Fail | |
| TC 14.2 | Journal Empty State | ☐ Pass / ☐ Fail | |

---

### Acceptance Sign-Off

| Role | Signature | Date |
|------|-----------|------|
| Client | | ___________ |
| Contractor | | ___________ |
