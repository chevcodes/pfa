# Personal Finance Analyser

Personal Finance Analyser is a private, on-device personal finance tool that turns bank, credit-card, and investment statement PDFs into a calm, honest picture of where you stand, what happened, and what you're working toward. It is built for someone who reviews their money periodically — monthly or quarterly — rather than someone tracking every transaction live.

The application has **no backend, no account, no telemetry, and no cloud service.** PDFs are read locally with pdf.js and every figure is stored on-device in IndexedDB. The desktop build serves the interface over localhost; the installable PWA uses a service worker to cache the application shell offline. Data leaves the device only when you deliberately export or share it.

---

## Table of contents

- [Supported statements](#supported-statements)
- [The four views](#the-four-views)
- [Core principles the app is built on](#core-principles-the-app-is-built-on)
- [Features](#features)
- [Setup](#setup)
- [Usage](#usage)
- [Data safety and testing philosophy](#data-safety-and-testing-philosophy)
- [Known limits](#known-limits)

---

## Supported statements

- **Scotiabank-style credit-card statement PDFs**, including supported NCB variants.
- **Scotiabank bank-account PDFs** containing a Withdrawals & Deposits ledger and Account Summary.
- **Scotia Investments and NCB Capital Markets investment statement PDFs**, including multi-account, multi-provider portfolios (e.g. a Scotia account and one or more NCB accounts held simultaneously).
- **Jamaica-focused currency handling**, with JMD as the configured base currency. Foreign-currency accounts and holdings (USD balances, USD-denominated funds) are parsed, reconciled, and displayed separately, using their own dated exchange rate — they are never silently folded into JMD totals.

Other statement layouts are not guaranteed to parse correctly. Always check the reconciliation result and totals after importing a new statement format, and treat a statement that fails to reconcile as a signal to inspect it rather than trust it.

---

## The four views

The app is organised around four destinations, ordered from the most immediate to the most forward-looking:

### Overview
Answers "where do things stand right now." Leads with what's genuinely spendable after known fixed expenses, shows recent cash movement, and surfaces anything that needs a decision — an overdue bill, a statement gap, a goal that's fallen off track. Reads the full imported history rather than a selectable period, since its content doesn't meaningfully change with the reporting window.

Its attention card tells the story since your last newly imported statement ("Since your July statement"): at most three plain causes drawn from across the app — a payment that has become regular or gone up, a charge larger than usual for that place, money added to or lost by your investments, a goal that has fallen off track — with anything needing a decision first, then what your goal, saved plan or savings accounts point to, and size only after that. Small changes that repeat qualify on their weight over a year; one-offs must be large. A quiet month closes with what is true ("Nothing new or unusual stood out in your spending and your investments grew by about $12k on their own"), never a bare "nothing". The reference point moves only when a statement that extends your history is imported, so reopening the app, re-importing a file or adding older statements never resets it; a first import states where things stand and claims no "since". A cause is only shown when its explanation exists — investments that cannot yet be separated into money added and growth are left out, and are not described as fine either.

### Activity
The complete, searchable transaction history across both card and bank ledgers. Supports filtering by month, category, merchant, account, and amount; category correction with personal rules and undo; custom categories and personal tags; transaction splitting across categories; and a fixed-expenses-versus-discretionary-spending breakdown. Automatic insights name the specific category, merchant, or transaction responsible for a meaningful change rather than stating a bare percentage.

### Position
"Where do I stand overall." Shows recorded net worth (assets minus debts), built from cash and bank balances, the credit card balance, and recorded investments, naming the asset and debt classes it is built from, with the recognised classes not yet included listed behind Why. The page is built calm-by-default: net worth is stated once, and the heavier sections — the full assets/debts breakdown, the per-account cash split, and the shareable financial summary — start collapsed, each showing a one-line summary, opening to full detail on request. A dedicated Investments card shows the combined portfolio value, how that whole value moved since the previous statement (naming any money added), contributions, a value-over-time chart, and a cost-based performance read in its detail (see Investments below).

### Plan
A conscious-spending-style plan rather than a generic budget. Income divides into three bands — **Fixed expenses**, **Savings & investments**, and **Free spending** — computed against a *typical* month (protected from being skewed by one unusually large or small pay period), not the calendar month currently on screen. The hero figure leads with what's genuinely free to spend, paired with a plain reconciling sentence about anything unusual (money not yet moved, a card balance not yet cleared), never a bare, unexplained number. Directly beneath it, one line says whether each account's statements are up to date; it opens itself only when one is overdue.

Plan also holds three goals:
- **Cash cushion / emergency fund** — sized in months of income rather than days of spending, with progress described in plain language ("just over one month saved, working toward five") rather than a decimal.
- **Clear the card** — a single steady monthly payment above the minimum for one card; a genuine choice between clearing the highest-interest balance first or the smallest balance first once more than one card is held.
- **Spending limit** — tied directly to the plan's own free-spending figure, so there is never a second, possibly disagreeing number for "how much is meant to go to free spending."

---

## Core principles the app is built on

These aren't marketing language — they're structural rules enforced throughout the codebase, several backed by automated guards that fail the build if violated:

- **One number, one source.** Any figure that could appear on more than one screen (income, a balance, a total) is calculated once and read from that single place everywhere. Where two screens genuinely answer different questions with a similar-looking number, the difference is labelled, never silently forced to agree.
- **Calm by default, depth on request.** Every screen leads with one true, stated answer. Explanatory detail, breakdowns, and reasoning live behind a disclosure or an info icon, opened only when chosen — never a wall of permanently visible text.
- **Never imply spendable headroom that isn't real.** Figures that could be misread as "safe to spend" are always qualified against fixed expenses already due; a false sense of available cash is treated as a real design risk, not a nuance.
- **Provenance is always visible, never overt.** A figure's "as of" date is a quiet, permanent trace; the full reasoning behind it is one tap away. How insistently the app draws attention to a figure's freshness or estimated nature scales with how costly it would be to get wrong.
- **Reconciled and estimated figures never wear the same authority.** A statement-confirmed number and a self-reported or derived one are visually and textually distinguishable everywhere they appear, including in exports.
- **Reuse, don't duplicate.** One shared disclosure/collapse mechanism, one info-icon pattern, one charting tool, one calculation per concept — enforced by static guards that fail the build if a second, drifting copy of a shared calculation or component is introduced.

---

## Features

### Reading and categorising
- Automatic statement-type detection (bank, card, or investment) directly from the PDF's own structure.
- Card categorisation using a researched, Jamaica-focused merchant knowledge base, personal correction rules, and editable configuration-level rules — checked in that order of precedence.
- Manual category corrections with an optional "apply to all past and future transactions from this merchant" rule, custom person-authored categories, transaction splitting across categories, personal cross-category tags, and undo available on every reversible action.
- Statement-level reconciliation for card, bank, and investment ledgers. A same-month collision rule keeps only the latest statement per account per month if two statements are accidentally imported for the same period, with the set-aside statement named explicitly rather than silently dropped.

### Understanding your money
- Four destinations — **Overview, Activity, Position, Plan** — described above, sharing one resolved reporting period so no two tabs can disagree about which window of time is on screen.
- Recurring-payment and commitment detection, built from a shared, outlier-resistant "typical value" calculation (a recurrence-first method that also protects short histories from being skewed by a single unusual month), reused everywhere a "typical" figure is needed rather than computed separately per feature.
- A goal engine (cushion, card payoff, spending limit) with a monthly honest follow-up log, and a single resolver that decides whether a goal is "off track" — read identically by the goal card and by Overview's attention list, so the two can never disagree.
- **Balances between statements.** Once statements are imported, Position offers an "Update balances" card where today's balances can be typed against the accounts the statements already know; a blank account keeps its last figure and "Unchanged" carries one forward. Typed figures refresh the present — net worth, the per-account cash split, safe-to-spend and emergency-fund progress — each carrying a quiet "entered" date, and Overview leads with the two-point change since the last statement, named by span and never broken into invented months. The transaction history, typical month, forecast and goal targets stay statement-only and say so, and Activity marks where its reconciled history ends. A statement covering the typed date replaces those figures and says once how close they were. When figures are more than 35 days old, their date becomes the invitation to update. Typed balances travel in the encrypted backup but never appear in the shareable summary, CSV or printed report.

### Investments
- **Per-holding, cost-based performance** — the gap between current price and average cost — shown as a calm up/down signal drawn in proportion (a rise is never celebrated; only a fall of 10% or more carries colour) that stays honest even in a month heavy buying occurred, because average cost already absorbs the purchase. This is deliberately *not* raw value-change, which would misread a large contribution as spectacular growth.
- **Contributions detected and shown separately from market growth and cash sitting idle.** A holding a person just bought into is marked "new this month" rather than shown with a misleading flat or inflated signal; a stable-value fund (e.g. a money-market fund) is shown as "holds steady" rather than given a meaningless performance triangle; parked, uninvested cash counts toward the total but is explicitly excluded from performance.
- **Value-over-time chart** with contributions marked directly on the line, so a jump reads as "you added this," never as unexplained growth, alongside a growth-versus-currency-movement decomposition available on request rather than shown as permanent prose.
- **Two-account, two-provider support** (e.g. a Scotia account and one or more NCB accounts held at once) via an account segment (All / per-provider / per-account) that re-slices the whole card — headline, chart, and holdings — in place, without collapsing or losing scroll position. Holdings held across providers are handled with an explicit, documented rule for whether they merge or stay separate.
- **Holdings grouped by asset class** (equities, unit trusts/funds, cash) mirroring the statement's own structure, normalised across providers who use different section names for the same class, and shown only for classes actually held.
- **Foreign-currency holdings kept native**, each with its own dated exchange rate, never silently converted at a stale rate.
- **On-device account renaming** — a quiet, editable friendly name shown everywhere an account appears on screen (cash breakdown, investment segment, transaction filters), keyed on the app's real internal account identity so it survives re-importing statements. Renames are deliberately **not** applied in CSV exports, the printed report, or the shareable summary, which always show the real account identifier, since those are the surfaces meant to be relied on formally.

### Data, export, and privacy
- CSV export and printable reports through the browser's print dialog, both using full, exact figures (never shortened for display) and real account identifiers, since a person reading a pasted report has no interface to tap into for more detail.
- Encrypted, passphrase-protected `.ccah` history export and import, with idempotent merging across every ledger including investments — re-importing the same backup never duplicates data. The passphrase cannot be recovered if lost.
- A separate, human-readable JSON export/import for personal category rules alone, for transferring just your corrections without a full history backup.
- **Privacy mode** masks every figure, chart value, and account identifier on screen at once, while keeping every control (including newly added features like account renaming and the investment segment) fully usable.
- Desktop statements-folder watching, with new PDFs picked up automatically as they're saved into a watched directory.
- Installable as a Progressive Web App, including iPhone Home Screen installation for persistent offline storage.
- Light and dark themes, both designed to render financial charts and figures cleanly rather than as an afterthought of the base theme.

---

## Setup

**Requirements:** Node.js 20 or newer. The project is developed and tested with Node.js 24.

```bash
npm install
```

The install hook copies the required pdf.js files into `third-party/`. Refresh that copy later with:

```bash
npm run vendor
```

**Run the local web version:**

```bash
npm run web
```

Then open `http://localhost:8000` in a supported browser.

**Run the Electron desktop version**, including folder watching:

```bash
npm start
```

**Create desktop installers:**

```bash
npm run build
```

Output is written to `dist/`.

**Run the automated proof suite:**

```bash
npm test
```

Proof files follow the `tests/*_proof.mjs` naming convention. The suite includes static wiring guards that fail the build if:
- a declared IndexedDB store is named but never actually created and exposed;
- a shared calculation (a "typical value," an account balance, a contribution figure) is duplicated into a second, driftable copy instead of read from one source;
- an export or report code path reaches for a display-only figure-shortener, which would violate the full-precision rule for exports.

> **Note on verification standard:** this project treats a passing test suite as necessary but not sufficient. Every meaningful change is also confirmed against an actual fresh-tab boot with real statement data loaded and a clean browser console, because several past defects passed every automated test yet crashed or misbehaved at runtime.

---

## Usage

1. Choose **Add statement** and select one or more PDF files. On desktop, PDFs can also be dropped directly onto the application window.
2. Review the detected ledger type, imported transactions or holdings, totals, and reconciliation status. Statements route automatically to Activity, Position, or the investment view.
3. On desktop, use **Watch folder** to monitor a statements directory for new files automatically; the web/PWA version uses manual file selection.
4. Search, filter, sort, and correct categories as needed. Split a transaction across categories or attach a personal tag from the transaction row. Rename an account inline from Position → **Where your cash sits**.
5. Set up a Plan (fixed/savings/free split) and any goals (cushion, card payoff, spending limit) from the Plan tab.
6. Export **CSV** or use **Print / Save as PDF** for a full-precision report. Use **Export encrypted history** for a complete, passphrase-protected backup covering every ledger, including investments. Use **Export rules** separately to transfer only your personal category corrections.

For iPhone, host the project on an HTTPS static host, open it in Safari, and use **Add to Home Screen**. The local development server is HTTP only and is not an iPhone deployment method. Home Screen installation is strongly recommended for persistent offline storage, since Safari clears local storage for ordinary web pages left uninstalled.

---

## Data safety and testing philosophy

- **Nothing is trusted on a green test suite alone.** Every significant change is verified with an actual browser boot against real statement data, because the test suite has, in the past, stayed green through a genuine startup crash and a genuinely broken database wiring.
- **Destructive and state-changing actions are reversible where practical** — category corrections, account designations, plan targets, and goal changes all support undo through a consistent toast-and-undo pattern, rather than each feature inventing its own.
- **A backup is only considered proven if it has actually been restored**, not merely generated. Restore is treated as the highest-risk, most important lifecycle path to verify, since a backup that silently fails to restore part of the data (investments, for instance) is a form of data loss that's easy to miss until it's too late.

---

## Known limits

- **One card at a time.** Cash-and-debt figures read the most recent credit-card statement, so if statements for more than one card are imported, only the newest card's balance counts toward what you owe. Position names the card it used and says how many others are not counted, rather than leaving the gap silent.

- The investment reader currently focuses on holdings-level detail (contributions, cost-based performance, value over time); a full itemised breakdown of every statement activity line (individual distributions, withholding tax, discrete purchase/withdrawal events) is a deliberately deferred, later piece of work.
- Statement layouts outside the supported Scotiabank and NCB formats are not guaranteed to parse; always verify reconciliation after introducing a new source.
- The app is designed for periodic review (monthly/quarterly), not live or intraday tracking — it deliberately does not attempt real-time pricing or continuous balance monitoring.
