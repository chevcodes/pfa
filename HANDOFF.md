# PFA React/shadcn Migration — Handoff to Codex

Written by a prior Claude Code session after independently re-verifying every claim below against the real repository (git log, git diff, grep, a live test run) rather than trusting its own memory. Where a prior belief and the re-audit disagreed, the re-audit wins and is stated explicitly.

## PWA / real-browser verification pass (read this before trusting any earlier "verified in Electron" claim)

**Electron was NOT used anywhere in this pass.** A prior verification pass (see the old "Part 2 soundness check" further down) exercised the app only through Electron, at one viewport, in light theme, via mouse clicks — that check never touched the actual PWA path (a real Chromium browser served the static files the way a phone or desktop browser actually reaches them). This pass fixes that gap. Setup: `node developer-tools/serve.js` (the project's own static server, `npm run web`) on `localhost:8123`, driven by `playwright-core`'s `chromium.launch()` (a real, separate browser process — not `_electron`), with `page.tap()` used at mobile viewport/touch contexts and `page.click()`/`page.mouse` at desktop.

**Service worker registration**: `navigator.serviceWorker.getRegistrations()` returned `NO_REGISTRATIONS` at both viewports. This is **not a bug** — `application/app-controller.js` (~line 4319) deliberately skips SW registration on any `localhost` host so local development always serves live files with no cache in front; it only registers on a real non-localhost deployment. Serving via `localhost:8123` therefore cannot exercise this path at all. **Unverified, not confirmed-passing**: nobody has checked SW registration against a real non-localhost PWA install in this migration. That still needs doing — e.g. serve over a LAN IP or a real hostname, not `localhost`.

**The 16-cell matrix (4 tabs × {mobile 375×812, desktop 1280×800} × {light, dark}), all real, all screenshotted** (`/tmp/shots-pwa/*.png`, not committed — regenerate by re-running the same driver approach if needed):

| Area | Result |
|---|---|
| No horizontal overflow, React-migrated components | **Clean on every cell.** `document.documentElement.scrollWidth` vs `clientWidth` checked before and after opening disclosures, all 4 tabs, both viewports, both themes. |
| Disclosure/Accordion cards (`collapsibleCardReact`) | **Confirmed working under real touch (`page.touchscreen.tap`) and real mouse click**, `data-state` toggled closed↔open correctly, re-verified across the matrix. |
| Donut chart (`donutChartReact`) | **Confirmed correct** at both viewports: real `<svg>`, correct data, and — once the hover/tap point was corrected to land on the actual ring stroke (43% of figure width from centre, not the bounding-box centre or a raw top-edge guess) — the tooltip rendered legibly with no clipping/overflow at mobile width (183.75px wide, fully inside the 375px viewport) and at desktop (148.9px wide, no overflow). An earlier reading of `width:0`/empty tooltip at desktop was this session's own coordinate mistake, not an app defect — corrected and re-verified. |
| Vanilla/React visual seam (Plan's proportion bar next to React cards) | **No seam found** at mobile width — spacing and sizing match, screenshot-confirmed. |
| Console errors during interaction (not just on load) | **Zero**, across every cell of the matrix, tabs switched, cards toggled, popovers tapped, chart hovered. |

**One confirmed, real, NOT-fixed defect — the info popover can render completely off-screen.** Isolated repro (not a fluke; reproduced twice, with 300ms and 1500ms waits, identical result): on the Activity tab, with several cards opened and the page scrolled ~2750px down, tapping/clicking a `.pfa-info-trigger` that is genuinely on-screen (scrolled into view, confirmed by its own `getBoundingClientRect()` immediately before the click) opens the popover (`present: true`, correct content text) but positions it at `transform: translate(12px, -816px)` on a `position: fixed` wrapper — 816px above the top of the viewport, completely invisible. Root cause is not fully diagnosed: the `.chart-info > .chart-info-body` CSS rule in `interface/flow-chart.css` that positioned the old native-`<details>` version does **not** apply to the React version at all (selector requires a direct-child relationship that a Radix `Portal` breaks — confirmed via `getComputedStyle`, the React popover's `position` comes entirely from Radix/floating-ui's own inline styles, not from that CSS rule), so that's not the cause; the `-816px` figure looks like a stale anchor measurement, but this session could not pin down definitively whether it's a floating-ui `autoUpdate` timing gap, an interaction with the page's `mountTopGreeting` welcome-back toast (`application/ui/app-messages.js`) mutating layout while the popover positions itself, or something else. **Left unfixed deliberately** — AGENTS.md requires a fix to be verified, not guessed, and this session ran out of budget to isolate the real cause with confidence. A single ordinary interaction (open one card near the top of the page, tap its icon, no deep scroll) was NOT observed to reproduce this in the time available, so the severity is unclear — it may be narrow (deep-scroll + specific timing) rather than universal. **This is the top item for whoever picks this up next**: reproduce with the steps above (scroll deep, open several disclosures first, then tap a now-visible `.pfa-info-trigger`), inspect `document.querySelector('[data-radix-popper-content-wrapper]').getAttribute('style')` immediately after, and check whether Radix's Popper needs an explicit `Popover.Content`-level `sticky="always"` prop, or whether the `mountTopGreeting` toast (which self-removes via `setTimeout(() => box.remove(), 320)`, mutating layout) is interfering with a position computed just before it disappears.

**Horizontal overflow found, but in vanilla, non-migrated components — not this session's to fix.** At mobile width, dark theme, Activity tab, `document.documentElement.scrollWidth` (392px) exceeded `clientWidth` (375px) by 17px. Traced to two elements, both confirmed vanilla (no React CSS touches either — checked `application/ui/react-dist/pfa-react.css` and `react-ui/styles/*.css`, no match): the `.ledger-tabs` tab strip (`interface/feature-additions.css` / `interface/premium.css`, deliberately left vanilla per this document's own section 3) and `.chart-canvas`/`.chart-plot` — the vanilla column chart (`chart-surface.js`'s `renderColumnChart`, the item already flagged in section 4 as the largest remaining migration item, which has a documented "scroll affordance for when columns overflow" that appears not to be properly contained at 375px, letting the whole page scroll sideways instead of just the chart). This is exactly the "documented failure class" the task description named — but it predates this migration and sits entirely in code this migration was told not to touch. Recorded here as a real bug for whoever eventually does the column-chart migration (or a separate fix), not fixed in this pass.

**Test suite and hard boundary, re-confirmed after this pass**: `npm test` → 66 pass, 3 fail (same three as always: `ncb_bank_reader_proof.mjs`, `scotia_card_period_proof.mjs`, `statement_nudge_prompt_proof.mjs`). `git diff c12775a HEAD -- application/analysis/ application/statements/ application/core/storage.js application/core/money-format.js tests/ --stat` → empty, hard boundary still holds. No code was changed in this pass (verification only, nothing was fixed), so no commit was needed or made.

## 0. AGENTS.md / Agents-Design-Principles.md — now real files at the repo root, read them directly

Both files now exist for real at the repo root: `AGENTS.md` and `Agents-Design-Principles.md`. Read them directly — this section no longer reproduces their text (an earlier version of this document did; that copy was a stopgap for when they existed only as pasted reference material supplied to the session, not as committed files). Read them fully before making any change, same as AGENTS.md itself says.

**Known conflict, surfaced rather than silently resolved**: `.gitignore` (line 47) lists `AGENTS.md`, added by an earlier commit on `main` titled "Ignore repository agent instructions and correct assistant output paths" — a deliberate prior decision to keep that file untracked. Committing `AGENTS.md` for real (this pass, on explicit user instruction) required `git add -f` to override that ignore rule. The file is now tracked and on `main`, but the `.gitignore` entry itself was left as-is (not removed) since removing it wasn't explicitly asked for and touches a decision this session doesn't have the context to second-guess. This means a future plain `git status` won't flag local edits to `AGENTS.md` as untracked changes needing `-f` again, but the ignore rule and the tracked file now coexist in a slightly unusual state — worth a human decision on whether to remove the `.gitignore` line outright.

Three places this migration knowingly deviates from `AGENTS.md`, all worth knowing before touching anything further:

- **"Do not add packages, dependencies, or build steps."** — Violated deliberately. This migration adds React, Vite, Radix, Recharts and a build step (`npx vite build`), scoped only to `application/ui/` rendering and `react-ui/`. The user explicitly authorised this exception at the start of the migration. Do not extend it to any other part of the app without asking.
- **"Commit completed, verified work directly on `main`."** — Not followed. All work landed via feature branch + PR (`claude/confident-goldberg-9k0goe` → `main`), because this Claude Code Remote session's own branch instructions required it. If Codex runs under a similar remote-session branch mandate, follow that mandate over this line of AGENTS.md; if Codex has full direct-to-main access, AGENTS.md's instruction is the default to return to.
- **"Remove comments from any code you touch. Do not add new ones."** — Also violated in the new `react-ui/` component files (e.g. `pfa-donut-chart.jsx` carries a multi-line JSDoc-style block comment). This was not an approved exception, just an oversight. Flagging it rather than silently leaving it — Codex should decide whether to strip these comments as a small cleanup pass, or leave them since they explain non-obvious CSS-class-reuse decisions that AGENTS.md itself says elsewhere ("find the existing rule before writing a new one") are worth recording somewhere. Not urgent, but don't add further new comments without a reason stronger than "explains what it does."

Everything else in both documents still reads as accurate and unaffected by this migration — the "one number, one source," "one concept, one master list," collapsible-by-default, and confirmation-mechanism principles all describe the underlying analysis/statement logic, which this migration did not touch.

## 1. Exact current state of `main` — independently re-confirmed against GitHub

- `main` HEAD: **`46bb5f4`** — "Merge pull request #2 from chevcodes/claude/confident-goldberg-9k0goe", confirmed both by `git fetch origin main` (origin/main = `46bb5f4`) and by reading PR #2 back from GitHub directly (`state: closed`, `merged: true`, `merged_at: 2026-09-24T15:55:44Z`, `base.sha` was `c12775a` — the "UI Refresh" commit).
- Local `main` was stale (pointed at an old, never-fetched local commit). Hard-reset to `origin/main` after confirming the local-only commit was a content duplicate of what's already on GitHub — nothing was lost.
- No open PRs against this work; PR #1 and PR #2 are both merged and closed.
- **Test suite on the real, current `main`**: `npm test` → **66 pass, 3 fail**, out of 69 total.
  - Failing: `tests/ncb_bank_reader_proof.mjs`, `tests/scotia_card_period_proof.mjs`, `tests/statement_nudge_prompt_proof.mjs`.
  - These are **not** the same 3 tests a much earlier point in this migration reported as its baseline (`cushion_proof.mjs`, `product_polish_proof.mjs`, `ui_calmness_proof.mjs` — those were fixed by reverting specific call sites and now pass). The current 3 failures were independently confirmed, in a separate throwaway `git worktree` of `origin/main` with none of this migration's commits applied, to fail identically there too — they predate this migration and are unrelated to it (likely statement-parser/date-window issues in `application/statements/`, which this migration never touches).
- Nothing was uncommitted at the start of this audit; `git status` was clean before any of the above.

## 2. Fully migrated and verified (re-confirmed by grep against the real files just now, not from memory)

All of the following were re-checked via `grep -rn` across `application/ui/*.js` in this pass:

| Pattern | Old vanilla calls remaining | New React calls | Notes |
|---|---|---|---|
| Collapsible/disclosure card | **1** (`intentions-section.js:262`) | **25** (`collapsibleCardReact(`) | The 1 remaining vanilla call is pinned there deliberately — `tests/b2_render_proof.mjs` uses a synchronous non-browser DOM stub that breaks if this card is converted. Confirmed still true; do not convert this call site without first rewriting that test. |
| Info-icon / popover | **3** (`ahead-render.js:860`, `balance-updates-render.js:399`, `investments-render.js:484`) | **30** (`chartInfoReact(`) | Each of the 3 is pinned by a static-source-text regex test (`cushion_proof.mjs`, `ui_calmness_proof.mjs`, `product_polish_proof.mjs` respectively) that asserts on the literal `chartInfo(...)` source text at that exact line. Confirmed still true. |
| Donut/ring chart | **0** live vanilla calls of `renderDonutChart(` outside its own definition | **2** (`activity-render.js:385`, `cards-render.js:685`) | `cards-render.js`'s call (inside `renderMerchants`) was already flagged as dead code with no live callers anywhere in the app — re-confirmed no new callers have appeared. |
| Build toolchain | — | — | `vite.config.js` + `react-ui/` still build cleanly: `npx vite build` produces `application/ui/react-dist/pfa-react.js` (882.6 KB / 227.1 KB gzip) and `pfa-react.css` (18.1 KB / 4.35 KB gzip), and the committed output matches a fresh rebuild exactly (`git status` clean after rebuild). |

Both `decision-header.js`'s own internal calls to `chartInfo(` (lines 270, 532, 598) and `react-bridge.js`'s own calls (used inside its React-mirroring functions, plus explanatory comments) are the shared factories' own internals, not call sites needing conversion — correctly excluded from the counts above.

## 3. Deliberately left vanilla, permanently — with the real reasoning

- **Tab strip and toast system** — already correct, singleton implementations with no documented bugs and no duplication across the app. Migrating them adds React/bundle-size risk for zero behavioural benefit. Not scoped for reconsideration.
- **The small "Why" / explain disclosure inside `decision-header.js`'s own `collapsibleCard`/`chartInfo` definitions** — these are the shared factories themselves, the thing everything else now calls through. They stay vanilla because they're the implementation the bridge wraps, not a duplicate of it.
- **Proportion bar** (`chart-surface.js:366`, `renderProportionBar`, 2 real call sites: `investments-render.js:507`, `plan-render.js:227`) — investigated in detail and deliberately left vanilla. It's a single-row CSS `flex-grow` bar with no axis/scale geometry (unlike the donut, which genuinely benefits from Recharts' arc/tooltip machinery). Forcing it into Recharts' SVG bar-chart model would fight its "3px min-width floor, 2px segment gap, pill-shaped rounded track, `tabindex`+`role=img` per segment" behaviour for no real gain. Same reasoning class as the tab strip: already correct, not a good fit for the assigned tool.

None of these should be revisited by Codex without a concrete new reason (a bug report, a real duplication found) — they were not skipped for lack of time.

## 4. Every remaining vanilla surface — re-enumerated from this session's actual grep, not the old plan

### The column/line chart — `chart-surface.js:162`, `renderColumnChart(ctx, spec)`
**6 total references** (1 definition + 5 call sites), re-confirmed just now:
- `application/ui/accounts-render.js:301`
- `application/ui/cards-render.js:506`
- `application/ui/flow-chart-render.js:87`
- `application/ui/income-chart-render.js:122`
- `application/ui/investments-render.js:403`

Specific complex features a rewrite must preserve (read from the function body directly, not inferred):
- Dual bar/line rendering mode in one function.
- Multi-series support with gradients.
- Negative-value baseline flip (bars can extend below a zero line, not just up).
- Dense vs. sparse column-width adaptation — kicks in above 18 rows, compresses column width/spacing.
- Keyboard navigation between column hit-targets (arrow keys, Home/End).
- Guide lines with labels.
- An animated net-cash overlay line drawn via a `drawPath` helper, independent of the bar/column layer.
- Dashed rendering for missing-data points, and a separate marker style for incomplete months.
- A scroll affordance for when columns overflow the visible width.
- A dynamically built legend.

This is the single largest remaining item. Budget for it accordingly — it is comparable in size to everything already migrated in this project combined.

### The two separate chart implementations chart-helpers.js does not share with chart-surface.js
- `application/ui/income-chart-render.js` (156 lines)
- `application/ui/flow-chart-render.js` (129 lines)

Both call `renderColumnChart(` directly (see list above) but are otherwise bespoke per-screen wrappers around it, not sharing a common factory with each other. Each is its own migration unit once `renderColumnChart` itself is done — do not assume converting the column chart automatically converts these; they build their own `spec` objects and have their own surrounding vanilla DOM.

### The transaction table
**Not independently re-confirmed with the same rigor as the items above — flagging this honestly rather than repeating an old unverified claim.** A prior point in this session claimed "5 call-site files, no shared factory," but this re-audit's own grep for that exact shape (`renderTransactionTable`, `transaction-table`, `txn-table`, `<table`) returned **zero matches** — meaning either the actual implementation uses different naming than assumed, or the earlier claim was imprecise. What the re-audit did confirm: 13 files under `application/ui/` reference the word "transaction" in some form (`accounts-render.js`, `activity-render.js`, `ahead-render.js`, `app-intake.js`, `balance-updates-render.js`, `cards-render.js`, `category-picker.js`, `confirm-control.js`, `flow-chart-render.js`, `intentions-section.js`, `manage-data.js`, `overview-render.js`, `treemap-render.js`), and `activity-render.js` contains at least one `render*Row`-shaped function. **Codex's first step on this item must be its own fresh grep and read of the actual row-rendering code before estimating scope** — do not carry forward the "5 files, no shared factory" claim as fact; it has not survived this re-audit unverified.

### Newly discovered during this re-audit
**Nothing new.** The re-audit specifically diffed `application/ui/` between the last point this session's own work is anchored to (commit `86c2e58`) and the current `main` tip's pre-migration ancestor (`c12775a`, the second "UI Refresh") and found **zero changes** to any file in `application/ui/` — the only difference was the 1-line service-worker version bump already accounted for in section 1. The wider historical diff (back to `69a77f7`, a much older restructure commit) shows many "new" files (`decision-header.js`, `chart-surface.js`, `plan-render.js`, etc.), but these predate this migration's own starting point and are the renamed/split output of an earlier "Refactor application structure" commit, not net-new work that landed in parallel during this migration — do not treat them as unassessed surface area needing separate scoping; they're the same files already accounted for above under their current names.

## 5. Hard boundary — restated, and confirmed held

`application/analysis/`, `application/statements/`, `application/core/storage.js`, `application/core/money-format.js`, and every `tests/*_proof.mjs` file were diffed just now between the commit immediately before this migration's toolchain was stood up and the current `main` HEAD:

```
git diff <pre-migration-commit> HEAD -- application/analysis/ application/statements/ application/core/storage.js application/core/money-format.js tests/ --stat
```

**Output: empty. Zero changed lines, zero changed files.** The hard boundary held completely — confirmed by diff, not by memory.

## 6. Verification standard Codex must follow — stated in full

1. **Before any conversion**: take screenshot comparisons of the vanilla original at light theme, dark theme, 375px width, and desktop width. Keep them to compare against the React replacement after.
2. **Real interaction testing**: load the actual running app (Electron or the PWA via `npm run web`) with a real sample persona's data (e.g. the existing "Trevor" persona), not just an isolated component harness. Click, hover, and keyboard-navigate the actual converted element. Check the browser/Electron console for errors.
3. **Full test suite, held at the exact same baseline**: run `npm test` (`node --test tests/*_proof.mjs`) before and after every change. The baseline right now is **66 pass / 3 fail out of 69** — the 3 known, pre-existing, unrelated failures are `tests/ncb_bank_reader_proof.mjs`, `tests/scotia_card_period_proof.mjs`, and `tests/statement_nudge_prompt_proof.mjs`. These fail on a clean, untouched `main` with none of this migration applied (independently re-verified via a throwaway `git worktree` of `origin/main` in this session) — treat any *other* new failure as caused by your change and fix it before moving on; never wave away a *new* failure as "probably pre-existing" without doing the same worktree check yourself.
4. **Electron boot check** after any meaningful chunk of work: `xvfb-run -a --server-args="-screen 0 1280x800x24" npx electron . --no-sandbox`, confirm the process stays running past startup (dbus/GPU errors in the log are normal sandbox noise in this container, not app failures — a real failure means the process exits within a few seconds).
5. **Never report a merge or push as done without independently re-checking GitHub's actual state afterward.** This exact mistake already happened once in this project's history (a force-push to `main` silently orphaned commits from an earlier merge) and cost real time to untangle. After any push or merge, run `git fetch origin main` and either read the PR back from GitHub directly or confirm via `git merge-base --is-ancestor <your-commit> origin/main` — do not trust a tool's "merged: true" response alone as the final word without this independent re-check.
6. **Rebuild before trusting the committed bundle**: run `npx vite build` and confirm `git status` is clean afterward (i.e. the committed `application/ui/react-dist/` output matches a fresh build exactly) before relying on it.

## 7. Open judgment calls and risks

- **Current bundle size**: `pfa-react.js` is 882.6 KB / 227.1 KB gzip; `pfa-react.css` is 18.1 KB / 4.35 KB gzip (measured just now via a fresh `npx vite build`, not carried forward from memory). This is a real, growing cost — it started at 227 KB gzip before a `NODE_ENV` dead-code-elimination fix dropped it to 86.65 KB gzip for the accordion alone, then grew back up as Popover and Recharts were added. Converting the column chart (which needs its own Recharts usage or an equivalent) will grow this further. Worth deciding, before that conversion starts, whether the bundle should be code-split per component (so a screen that never opens a chart doesn't pay for Recharts) rather than continuing as one fixed-name library-mode bundle — this was not addressed in this migration and is a real architectural fork in the road for whoever does the column chart.
- **Vite lib-build quirks already discovered, so they aren't rediscovered**:
  - Vite's library mode does not strip `process.env.NODE_ENV` the way its default app build does — without `define: { 'process.env.NODE_ENV': JSON.stringify('production') }` in `vite.config.js`, you get a runtime `process is not defined` error, and React's dev-mode code paths aren't dead-code-eliminated (this alone was a 227 KB → 86.65 KB gzip difference before other libraries were added back in).
  - `minify: 'esbuild'` fails in this environment's Vite/Rolldown setup (esbuild isn't available as a separate binary here); `minify: 'oxc'` is the working alternative.
- **New risk surfaced by this re-audit**: the transaction-table scope (section 4) is genuinely unverified, not just under-scoped. Do not let "5 files, no shared factory" propagate further as if it were confirmed — it wasn't found on a fresh grep. Budget time to re-derive its real shape before estimating the work, rather than trusting the number carried into this document from an earlier, less rigorous pass.
- **The JSDoc-style comments added to `react-ui/*.jsx` files** (section 0) are a small, known AGENTS.md violation. Low priority, but don't compound it by adding more.
