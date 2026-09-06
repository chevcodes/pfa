import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  draftDiffersFromSaved,
  draftIsEdited,
  hasDraftContent,
  makePlanDraft,
  planSaveState,
  readPlanDraft,
} from '../application/analysis/plan-draft.js';
import { isUsableTarget, targetsTotal100 } from '../application/analysis/plan.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CFG = JSON.parse(readFileSync(join(ROOT, 'settings', 'config.json'), 'utf8'));

let pass = 0,
  fail = 0;
const note = (c, l) => {
  if (c) pass++;
  else {
    fail++;
    console.log('   FAIL', l);
  }
};
console.log('='.repeat(72));
console.log(' PLAN DRAFT - typing is never silently undone');
console.log('='.repeat(72));

console.log('\n -- a draft is only a draft when there is something in it --');
note(makePlanDraft({}) === null, 'nothing typed and nothing answered is not a draft');
note(makePlanDraft({ targets: {} }) === null, 'an empty target object is not a draft');
note(makePlanDraft({ targets: { fixed: 55 } }) !== null, 'a typed percentage is');
note(makePlanDraft({ answers: { Groceries: 'fixed' } }) !== null, 'so is a single wizard answer');
note(hasDraftContent(null) === false, 'no draft has no content');

console.log('\n -- only plausible percentages survive --');
const d = makePlanDraft({ targets: { fixed: 55, setAside: 25, free: 20, bogus: 9, huge: 900 } });
note(d.targets.fixed === 55 && d.targets.setAside === 25, 'typed values are kept');
note(d.targets.bogus === undefined, 'a key that is not a group is dropped');
note(makePlanDraft({ targets: { fixed: 900 } }) === null, 'an impossible share is not a draft at all');
note(makePlanDraft({ targets: { fixed: -5 } }) === null, 'nor a negative one');

console.log('\n -- it round-trips through storage --');
const stored = JSON.parse(JSON.stringify(makePlanDraft({ targets: { fixed: 55 }, answers: { Groceries: 'free' }, step: 3 })));
const back = readPlanDraft(stored);
note(back.targets.fixed === 55, 'typed percentages come back');
note(back.answers.Groceries === 'free', 'wizard answers come back');
note(back.step === 3, 'and the question they had reached');
note(readPlanDraft({ v: 99, targets: { fixed: 55 } }) === null, 'an unknown draft version is discarded, not guessed at');
note(readPlanDraft(null) === null, 'nothing stored is no draft');
note(readPlanDraft('not an object') === null, 'a corrupt value is no draft');
note(readPlanDraft([1, 2]) === null, 'nor an array');

console.log('\n -- "not saved yet" means genuinely different from what is saved --');
const saved = { fixed: 60, setAside: 20, free: 20, v: 2 };
note(draftDiffersFromSaved({ fixed: 55 }, saved, CFG) === true, 'a changed share is unsaved work');
note(draftDiffersFromSaved({ fixed: 60, setAside: 20, free: 20 }, saved, CFG) === false, 'typing the same numbers back is NOT unsaved work');
note(draftDiffersFromSaved(null, saved, CFG) === false, 'no draft is never unsaved work');
// REVERSED, deliberately. This previously asserted false, on the reasoning that
// with nothing saved the comparison is against the shipped default, so typing
// 60/20/20 into a fresh app is "not pending". That reasoning treats NEVER SAVED
// and SAVED AND UNCHANGED as the same state, and the card cannot: it drove a
// status line reading "Not saved yet" beside a button reading "Saved", and that
// button was DISABLED - so 60/20/20, the plan a first-time user is most likely
// to simply accept, was the one plan they could not save.
//
// With no usable saved target there is by definition something to save.
note(
  draftDiffersFromSaved({ fixed: 60, setAside: 20, free: 20 }, null, CFG) === true,
  'with nothing saved, the default IS pending - never-saved is not saved-and-unchanged'
);
// A target from an older build (no v:2) is not usable either, so it must not
// read as "already saved" and lock the button the same way.
note(
  draftDiffersFromSaved({ fixed: 60, setAside: 20, free: 20 }, { fixed: 60, setAside: 20, free: 20 }, CFG) === true,
  'and an unusable stored target counts as nothing saved, not as a match'
);
note(draftDiffersFromSaved({ fixed: 61 }, null, CFG) === true, 'but a real change from the default is');

console.log('\n -- the wiring that makes it actually work --');
const planRender = readFileSync(join(ROOT, 'application', 'ui', 'plan-render.js'), 'utf8');
const wizard = readFileSync(join(ROOT, 'application', 'ui', 'plan-wizard.js'), 'utf8');
const controller = readFileSync(join(ROOT, 'application', 'app-controller.js'), 'utf8');
const planDraft = readFileSync(join(ROOT, 'application', 'analysis', 'plan-draft.js'), 'utf8');
// _draftTargets was declared, read once and never assigned - so an edit lived
// only in the DOM input and any re-render restored the saved figures silently.
note(/_draftTargets = unsaved \? \{ \.\.\.t \} : null/.test(planRender), 'a typed edit is captured, not left in the DOM alone');
note(/Store\.setMeta\(PLAN_DRAFT_KEY/.test(planRender), 'and persisted');
note(/clearTimeout\(_saveTimer\)/.test(planRender), 'debounced, so typing does not write on every keystroke');
note(/unsavedFlag\.hidden = !unsaved/.test(planRender), 'and the person is told it is not saved yet');
note(/key: PLAN_DRAFT_KEY, value: null/.test(planRender), 'saving the plan clears the draft');
note(/_answers = draft && draft\.answers/.test(wizard), 'the wizard reopens on the answers already given');
// Through the shared contract now, which is a STRONGER guarantee than the
// bare `persistDraft(); render();` this used to assert: commitAndRender awaits
// the write before repainting, where the hand-written pair did not.
note(
  /commitAndRender\(\{ commit: persistDraft, render \}\)/.test(wizard),
  'each answer is stored as it is given, not only at the end - and awaited before the repaint'
);
note(/state\._planDraft = readPlanDraft/.test(controller), 'and the draft is hydrated at boot');
const epochStart = controller.indexOf('const epoch = [');
const epoch = controller.slice(epochStart, controller.indexOf('];', epochStart));
note(epoch.includes('state._planDraft'), 'a restored draft is in the render epoch, so the controls repaint');

console.log('\n -- a draft never becomes the plan by accident --');
// The draft restores the CONTROLS. If it also drove the model, unsaved typing
// would move the bands, the Overview "free to spend" figure and the printed
// report - describing a plan nobody committed to.
note(
  /targets: overrideTargets !== undefined \? overrideTargets : state\._planTarget,/.test(planRender),
  'the plan model reads the SAVED target, never the draft'
);
note(
  !/_draftTargets \|\| state\._planTarget/.test(planRender),
  'the old draft-first fallback is gone'
);
// ONE reader for "what is typed but not saved". The expression used to be
// written inline where the inputs are restored; the hero did not have it, so on
// a reload the hero announced "plan saved" above an editor already showing the
// restored edits and reading "not saved yet".
note(
  /function currentDraftTargets\(\) \{\s*\n\s*return _draftTargets \|\| \(state\._planDraft && state\._planDraft\.targets\) \|\| null;/.test(
    planRender
  ),
  'one reader knows where unsaved typing currently lives'
);
note(
  /const restored = currentDraftTargets\(\);/.test(planRender),
  'the draft is used for the input values only, through that reader'
);
note(
  !/_draftTargets \|\| \(state\._planDraft && state\._planDraft\.targets\)/.test(
    planRender.replace(/function currentDraftTargets[\s\S]*?\n {2}\}/, '')
  ),
  'and nowhere else re-derives it'
);

console.log('\n -- one answer to "is my plan saved?" --');
// Item 19's contradiction, found again on a new surface: the editor asked
// draftDiffersFromSaved, the hero asked model.targetsAreDefault - which means
// "this plan is mine rather than the default", a different question in the same
// words. One typed digit and the card said "plan saved" while the editor beside
// it said "not saved yet" over a button reading "Save my plan".
note(
  /export function planSaveState/.test(planDraft),
  'one function decides whether a plan is saved'
);
note(
  !/targetsAreDefault\) tags\.push\(\{ text: 'plan saved'/.test(planRender),
  'the hero no longer answers it from targetsAreDefault'
);
note(
  /const saveState = planSaveState\(\{\s*\n\s*draftTargets: currentDraftTargets\(\),/.test(planRender),
  'the hero tag reads that one function'
);
note(
  /paintHeroSaveTag\(unsaved\)/.test(planRender),
  'and is repainted on every draft change, since typing does not re-render it'
);
{
  // v: 2 is what makes a stored target usable (isUsableTarget); without it a
  // saved plan reads as never-saved, which is the case draftDiffersFromSaved
  // deliberately treats as "there is something to save".
  const saved = { v: 2, fixed: 60, setAside: 20, free: 20, savedAt: '2026-09-09' };
  const unchanged = planSaveState({
    draftTargets: { fixed: 60, setAside: 20, free: 20 },
    savedTarget: saved,
    cfg: {},
    targetsAreDefault: false,
  });
  const edited = planSaveState({
    draftTargets: { fixed: 45, setAside: 20, free: 20 },
    savedTarget: saved,
    cfg: {},
    targetsAreDefault: false,
  });
  const untouched = planSaveState({
    draftTargets: null,
    savedTarget: null,
    cfg: {},
    targetsAreDefault: true,
  });
  note(unchanged.label === 'plan saved', 'a committed plan with nothing typed reads "plan saved"');
  note(edited.label === 'unsaved changes', 'one edited share reads "unsaved changes"');
  note(edited.tone === 'watch', 'and is toned as something to act on, not as good news');
  note(untouched.label === '', 'a plan nobody has made yet claims nothing');
  const shownDefaults = planSaveState({
    draftTargets: { fixed: 60, setAside: 20, free: 20 },
    savedTarget: null,
    cfg: {},
    targetsAreDefault: true,
  });
  note(shownDefaults.label === '', 'the untouched defaults an editor shows are not "unsaved changes"');
  note(draftIsEdited({ fixed: 60, setAside: 20, free: 20 }, null, CFG) === false, 'showing the defaults is not an edit');
  note(draftIsEdited({ fixed: 61, setAside: 19, free: 20 }, null, CFG) === true, 'typing over them is');
  note(draftDiffersFromSaved({ fixed: 60, setAside: 20, free: 20 }, null, CFG) === true, 'while the untouched defaults can still be saved');
  note(/const unsaved = draftIsEdited\(t, state\._planTarget, state\.cfg\);/.test(planRender), 'the editor records a draft only for what was typed');
  note(/draftIsEdited\(state\._planDraft\.targets, state\._planTarget, state\.cfg\)/.test(planRender), 'and never tells a person about edits they did not make');
}

console.log('\n -- the two halves of a draft never delete each other --');
// One record holds typed percentages AND wizard answers, written by two
// different places. Rebuilding it from one half wiped the other: after saving
// a plan, the percentages matched, the targets half went null, and every
// wizard answer went with it.
note(
  /answers: existing\.answers/.test(planRender),
  'the percentage writer carries the answers through'
);
note(/step: existing\.step/.test(planRender), 'including which question had been reached');
note(/targets: existing\.targets/.test(wizard), 'and the answer writer carries the percentages through');
const merged = makePlanDraft({ targets: null, answers: { Groceries: 'fixed' }, step: 2 });
note(merged !== null, 'answers alone still make a draft when no percentage is pending');
note(merged.answers.Groceries === 'fixed' && merged.step === 2, 'and they survive intact');
const both = makePlanDraft({ targets: { fixed: 55 }, answers: { Groceries: 'fixed' }, step: 2 });
note(both.targets.fixed === 55 && both.answers.Groceries === 'fixed', 'both halves can be held at once');

console.log('\n -- and it travels with a backup --');
const codec = readFileSync(join(ROOT, 'application', 'output', 'history-codec.js'), 'utf8');
const dataExport = readFileSync(join(ROOT, 'application', 'output', 'data-export.js'), 'utf8');
note(/draft: bundle\.planDraft/.test(codec), 'the encrypted payload carries the draft');
note(/planDraft: state\._planDraft/.test(dataExport), 'the export reads it from live state');
note(/\[PLAN_DRAFT_KEY\]: nextPlanDraft/.test(dataExport), 'and a restore writes it back');
note(/readPlanDraft\(state\._planDraft \|\| planning\.draft/.test(dataExport), 'validated on the way in, never trusted raw');

console.log('\n -- saving is reversible, keyboard-reachable and honest --');
note(targetsTotal100({ fixed: 60, setAside: 20, free: 20 }), 'a complete split is accepted');
note(!targetsTotal100({ fixed: 50, setAside: 20, free: 20 }), 'an under-allocated split is rejected');
note(!isUsableTarget({ fixed: 50, setAside: 20, free: 20, v: 2 }), 'an invalid saved split is not usable');
note(/if \(e\.key === 'Enter'\)/.test(planRender), 'Enter saves without reaching for the mouse');
note(/if \(e\.key === 'Escape'\)/.test(planRender), 'Escape abandons back to the saved plan');
note(/save\.disabled = !savable \|\| off/.test(planRender), 'the primary action is disabled when there is nothing valid to save');
note(/save\.textContent = savable \? 'Save my plan' : 'Saved'/.test(planRender), 'and says which state it is in');
note(/do not add up to 100%/.test(planRender), 'a split that does not balance is warned about before saving');
note(/make it 100%/.test(planRender) && /balanceShares/.test(planRender), 'and can be balanced from the take-home total');
note(/toast\('Plan cleared\.', async \(\) =>/.test(planRender), 'clearing a plan is undoable, like clearing a goal');
note(/Plan saved - \$\{saved\.fixed\}/.test(planRender) || /Plan saved/.test(planRender), 'saving reports what was saved');
note(/input\.addEventListener\('blur'/.test(planRender), 'a blank or out-of-range box is corrected rather than read as zero');
{
  const commit = planRender.slice(planRender.indexOf('async function commitPlan'), planRender.indexOf("save.addEventListener('click', commitPlan)"));
  note(commit.indexOf('render();') < commit.indexOf('toast(`Plan saved'), 'the saved screen is painted before its success message appears');
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: percentages typed and wizard answers given survive a re-render, a');
console.log('         reload and a restore, are marked as not yet saved, and are cleared');
console.log('         the moment the plan they belong to is committed.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
