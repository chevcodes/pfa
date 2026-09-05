# AGENTS.md
Instructions for any AI coding agent working in this repository (Personal Finance Analyser / PFA). Read this fully before making any change.

## What this project is
A privacy-first, offline-first personal finance app that processes Jamaican bank and credit card statements (Scotiabank, NCB). Built in vanilla JavaScript ES modules, shipped as both a PWA and an Electron desktop app. There are no external API calls and no build step. Treat the codebase as plain modules loaded directly.

## How to work in this codebase
- You have direct access to the files. Make changes in place, in the actual files. Editing the real code is the job; do not stop at proposing changes or pasting suggestions for someone else to apply.
- Make the smallest change that fully solves the problem. Prefer reversible, incremental edits over large rewrites.
- Before a large or multi-file sweep, create a restore point so any change can be undone: use git if it is available (a commit or a branch), otherwise copy the files you are about to touch. State which you used.
- Do not leave the tree in a broken or half-edited state at the end of a round. If a change cannot be finished safely, revert that piece and say so plainly.
- Preserve existing indentation style, casing, and formatting exactly. Do not reformat or rename anything that was not explicitly asked for.
- Remove comments from any code you touch. Do not add new ones.
- Do not add packages, dependencies, or build steps. Prefer solutions with the fewest moving parts, each independently testable and replaceable.

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
