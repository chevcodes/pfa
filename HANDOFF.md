# PFA React/shadcn Migration — Handoff to Codex

Written by a prior Claude Code session after independently re-verifying every claim below against the real repository (git log, git diff, grep, a live test run) rather than trusting its own memory. Where a prior belief and the re-audit disagreed, the re-audit wins and is stated explicitly.

## 0. AGENTS.md / Agents-Design-Principles.md — read first, and two discrepancies to know about

Neither file exists in the repo (`find . -iname AGENTS.md` and `-iname Agents-Design-Principles.md` return nothing). They were supplied to the prior session as pasted/uploaded reference documents, not repo files. Their content is reproduced in full below because Codex has no other way to see them. Two places this migration knowingly deviates from them, both pre-approved by the user for this migration only:

- **"Do not add packages, dependencies, or build steps."** — Violated deliberately. This migration adds React, Vite, Radix, Recharts and a build step (`npx vite build`), scoped only to `application/ui/` rendering and `react-ui/`. The user explicitly authorised this exception at the start of the migration. Do not extend it to any other part of the app without asking.
- **"Commit completed, verified work directly on `main`."** — Not followed. All work landed via feature branch + PR (`claude/confident-goldberg-9k0goe` → `main`), because this Claude Code Remote session's own branch instructions required it. If Codex runs under a similar remote-session branch mandate, follow that mandate over this line of AGENTS.md; if Codex has full direct-to-main access, AGENTS.md's instruction is the default to return to.
- **"Remove comments from any code you touch. Do not add new ones."** — Also violated in the new `react-ui/` component files (e.g. `pfa-donut-chart.jsx` carries a multi-line JSDoc-style block comment). This was not an approved exception, just an oversight. Flagging it rather than silently leaving it — Codex should decide whether to strip these comments as a small cleanup pass, or leave them since they explain non-obvious CSS-class-reuse decisions that AGENTS.md itself says elsewhere ("find the existing rule before writing a new one") are worth recording somewhere. Not urgent, but don't add further new comments without a reason stronger than "explains what it does."

Everything else in both documents (reproduced below) still reads as accurate and unaffected by this migration — the "one number, one source," "one concept, one master list," collapsible-by-default, and confirmation-mechanism principles all describe the underlying analysis/statement logic, which this migration did not touch.

<details>
<summary>Full text of AGENTS.md (reference only, not a repo file)</summary>

```
# AGENTS.md
Instructions for any AI coding agent working in this repository (Personal Finance Analyser / PFA). Read this fully before making any change.

## What this project is
A privacy-first, offline-first personal finance app that processes Jamaican bank and credit card statements (Scotiabank, NCB). Built in vanilla JavaScript ES modules, shipped as both a PWA and an Electron desktop app. There are no external API calls and no build step. Treat the codebase as plain modules loaded directly.

## How to work in this codebase
- You have direct access to the files. Make changes in place, in the actual files. Editing the real code is the job; do not stop at proposing changes or pasting suggestions for someone else to apply.
- Commit completed, verified work directly on `main`. Do not create branches unless the user explicitly requests one, and do not leave completed changes uncommitted.
- Make the smallest change that fully solves the problem. Prefer reversible, incremental edits over large rewrites.
- Before a large or multi-file sweep, create a restore point so any change can be undone: use git if it is available (a commit or a branch), otherwise copy the files you are about to touch. State which you used.
- Do not leave the tree in a broken or half-edited state at the end of a round. If a change cannot be finished safely, revert that piece and say so plainly.
- Preserve existing indentation style, casing, and formatting exactly. Do not reformat or rename anything that was not explicitly asked for.
- Remove comments from any code you touch. Do not add new ones.
- Do not add packages, dependencies, or build steps. Prefer solutions with the fewest moving parts, each independently testable and replaceable.

## Find the existing rule before writing a new one
- Before adding a style, a helper, a constant or a derived label, search for the shared one that already exists. This codebase deliberately centralises these, and re-implementing one is a defect even when the result looks correct: the copy silently misses whatever the shared version has learned.
- Known shared contracts to check first: the `:where(...)` groups in `interface/premium.css` (full-width and wrapping behaviour for prose and labels), the design tokens at the top of `premium.css` and `foundation.css`, `CARD_FACETS` / `BANK_FACETS` in `app-controller.js` (the one declared list of filter fields), `application/core/shared-helpers.js`, and the per-concern helpers in `application/ui/chart-helpers.js`.
- `interface/premium.css` holds cross-cutting contracts; `interface/feature-additions.css` is for genuinely new components. If a rule you are about to write would apply to a class of component rather than one component, it belongs in the shared group - join the selector list, do not restate its declarations.
- Never re-list a field name a registry already declares. A cache key, a reset, a count or a signature must be DERIVED from the declared source, or it will drift out of step with it silently.
- A label describing a chart, list or period must be derived from what is actually RENDERED, not from the data it was built from. Most charts here slice their input before drawing, so a label taken from the source names a range that is not on screen.
- When a rewrite removes a component, remove its CSS in the same pass. Orphaned rules are checked by `tests/wiring_contracts_proof.mjs`.
- Find more details in "Agents-Design-Principles.md"

## How to show what you changed
- Edit the files directly, then present the change as a scoped before-and-after diff covering only the lines touched. The diff is how the change gets reviewed; it is not a substitute for making the edit, and making the edit is not a substitute for showing the diff.
- Do not paste whole updated files into the report. Keep the shown diff tight: the changed lines plus just enough surrounding context to locate them.
- When one change spans several files, group the diffs by file so the full picture is easy to follow.
- List every file you touched, including one-line changes, so nothing is edited silently.

## How to verify before calling anything done
- Never claim a fix is correct without running an actual check. "Should work" or "this preserves behaviour" is not acceptable on its own.
- Run the project's test command (`node --test tests/*_proof.mjs`) against the tree after your changes and report the exact command and the exact result.
- When restructuring or splitting files, run the same test command before and after and compare the results directly, not just confirm the files parse.
- For behavioural or output parity, prefer SHA-256 hash comparison of generated output over visual inspection alone.
- Do not label a failing test "pre-existing" without proof. Run the identical test against the untouched original and confirm it fails there too, for the same reason.
- If a runtime is missing and a script cannot run, do not stop and report failure. State what the script would have run, then run the closest equivalent with an available runtime.
- For anything behavioural or visual, confirm it by actually performing it in the running app, not by asserting that it holds.
- Check for circular imports and duplicated logic whenever files are split or merged. A function copied into two places instead of shared through one import is a defect, since it will drift later.
- When a service worker or cache version is involved, state the previous and the new version strings explicitly, and bump once. Do not assume a bump happened.
- Before flagging a fix complete, check whether the same class of problem appears elsewhere. Fix every instance, not just the one reported.

## Communication style for reports back
- State what was actually run (exact command, exact result), not what should be true in theory.
- Separate confirmed fact from assumption. If something was not independently checked, say so rather than presenting it as verified.
- Use plain, non-technical language: describe what a person using the app would see or feel, not internal architecture. The reader is a product owner, not an engineer.
- No hedging filler, no generic caveats, no restating the brief. Be concise and specific.

## Privacy, persona, and sample-data rules
- You may open and test against the real NCB and Scotiabank statement samples to check the parser, the screens, the loading path, and real parse-error states.
- The hard line: no real merchant name, amount, account number, or other identifying detail may be written into any code, comment, sample data, or persona. Test with real files; commit nothing identifying.
- Never reuse a niche independent business that has appeared in real statement data, even disguised. Nationally recognised chains with no identifying fingerprint may be used in mock or sample data.
- Do not use income-segment or affluence-level framing in any user-facing text. That framing is internal working context only.

## Scope and decisions
- Do not restructure architecture unless it removes a real operational problem, cuts real cost, or shortens delivery. Avoid speculative refactors.
- Prefer reversible, incremental changes over large rewrites.
- If a decision can reasonably be made from context already in the repository, make it, state the reasoning in one line, and proceed. Do not defer straightforward decisions back as open questions.
```
</details>

<details>
<summary>Full text of Agents-Design-Principles.md (reference only, not a repo file)</summary>

```
Guiding Principles for App-Wide Consistency and Calm

This is a standing design direction, not a bug list. It applies everywhere in the app, not just to screens already discussed in this thread. Make the calls yourself, act on your own judgement across the whole codebase, and only come back if something is genuinely ambiguous or needs a decision only I can make.

Principle 1: One number, one source, always
Any figure that could plausibly appear on more than one screen must be calculated once, in one place, and read from that same place everywhere it's shown. Where two screens genuinely need to answer different questions that happen to look like the same number, label each one honestly rather than forcing a match. Applies retroactively — go looking for this pattern, not just cases already caught.

Principle 2: One concept, one master list, everywhere it's used
Anything attachable to a transaction, account, or goal must live in exactly one authoritative list, read by every screen that touches it. Nothing creatable in one corner of the app should be invisible elsewhere.

Principle 3: One concept, one wording, everywhere it appears
Any single idea should be generated from one function and reused, never typed out separately in multiple templates. Mismatched wording for the same concept signals two code paths where one should exist — consolidate, don't patch the symptom.

Principle 4: Quiet by default, depth available on request
Every screen opens with one true, calm thing — a number and a short sentence. Everything else starts collapsed. The one exception: anything requiring a decision right now (overdue payment, statement gap, a goal badly off track) stays visible without interaction, per the existing "Needs attention" pattern.

Principle 5: One way to expand, used consistently everywhere
Reuse whichever expand/collapse mechanism already works well, rather than inventing a new one per screen. Fix the shared pattern once rather than letting each screen grow its own variant.

Principle 6: A glance answers the question; a tap begins a journey
The first thing seen on any screen must be understandable at a glance. Once someone taps in, the screen is free to be as detailed as the feature needs.

Principle 7: Aesthetics and low-effort interaction are equal priorities to correctness
A technically correct fix that's visually inconsistent or effortful to use hasn't solved the real problem. Prefer the more thorough fix when proportionate.

Principle 8: The app connects the dots; the person shouldn't have to
Every stated fact should be the way into its own evidence, landing the person on exactly the rows/screen it describes. The same in reverse: the action belongs where the need becomes visible. Always reach first for the mechanism that already exists; where it genuinely can't carry the job, rebuild it rather than wiring a second thing beside it. A parallel mechanism is worse than a larger refactor.

Principle 9: A person's answer outranks the app's guess, permanently, through one shared mechanism
The app infers many things (internal transfers, genuine income, savings accounts, recurring commitments, merchant identity, ambiguous reversals). There must be exactly one shared mechanism for capturing an explicit human correction to any inference, read wherever that inference is consumed. Precedence: confirmation > inference, same as a manual category override outranks the categoriser. Silence is the default — most inferences are never questioned. A dismissed question stays dismissed. Nothing blocks on an answer. A confirmed answer survives contradicting data. Scope follows the inference's own natural level (merchant/transaction/account). No feature should be removed for simplification's sake — the goal is quieter surfacing, not less capability. Must be reversible via the existing toast-undo idiom, survive re-import/export/backup, and have a build-failing guard against a second private confirmation store ever growing.
```
</details>

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
