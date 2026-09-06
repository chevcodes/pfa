/* confirmations_proof.mjs - ONE shared confirmation mechanism.
 *
 * Two halves. The first proves the behaviour a person can see: an answer they
 * gave outranks the app's inference, both ways, permanently; a "no" is an
 * answer and is never asked again; a confirmed payment stays confirmed when
 * the data wobbles; nothing already answered is lost when the old mechanisms
 * are migrated, when a statement is removed, or when a backup is restored.
 *
 * The second is the build-failing guard. This project's recurring defect is
 * one concept growing three implementations, which is exactly what happened
 * here before: two confirmation id lists, a per-record flag and an account
 * designation, all meaning "the person told us this". The guard fails the
 * build if any inference grows its own private confirmation store again. */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CONFIRMABLE,
  answerFor,
  answeredAny,
  applyAnswer,
  confirmationId,
  confirmedSubjects,
  hasAnswered,
  isConfirmed,
  makeConfirmation,
  migrateLegacyConfirmations,
  pruneConfirmations,
  resolvedSet,
  sanitiseConfirmations,
} from '../application/analysis/confirmations.js';
import {
  applyLedgerRules,
  classifyInternalTransfers,
} from '../application/analysis/bank-analysis.js';
import { committedFlexible } from '../application/analysis/committed-flexible.js';
import {
  commitmentAndIncomePrimitive,
  expectedIncome,
  payCandidates,
  resolveOpts,
} from '../application/analysis/commitment-income.js';
import { buildAvailableNowModel } from '../application/analysis/available-now.js';
import { buildRows } from '../application/analysis/reporting-core.js';
import { buildStatementRemovalPlan } from '../application/analysis/statement-cascade.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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
console.log(' CONFIRMATIONS - one store, one writer, read wherever it matters');
console.log('='.repeat(72));

/* ------------------------------------------------------------------------
   THE PRECEDENCE RULE
   ------------------------------------------------------------------------ */
console.log('\n -- a person’s answer outranks the app’s inference --');
{
  const yes = makeConfirmation({ inference: 'income', subject: 'txn-1', answer: true });
  note(yes.source === 'person', 'an answer records that a person gave it, not the detector');
  note(yes.id === confirmationId('income', 'transaction', 'txn-1'), 'ids are deterministic');
  note(isConfirmed([yes], 'income', ['txn-1']), 'a yes reads back as a yes');

  const no = makeConfirmation({ inference: 'transfer', subject: 'own:7485', answer: false });
  note(answerFor([no], 'transfer', ['own:7485']) === false, 'a no is an answer, not an absence');
  note(hasAnswered([no], 'transfer', ['own:7485']), 'and it counts as answered');
  note(answerFor([], 'transfer', ['own:7485']) === null, 'never answered is a third state');

  let threw = null;
  try {
    makeConfirmation({ inference: 'transfer', subject: 'x', answer: true, scope: 'transaction' });
  } catch (e) {
    threw = e;
  }
  note(
    !!threw,
    'an inference true at one level cannot be answered at another - no second scope to choose'
  );
  note(
    !Object.keys(CONFIRMABLE).includes('fixed'),
    'whether a payment is fixed is NOT here: that is a fact about its category, and the plan bands already hold it'
  );
}

console.log('\n -- an answer survives data that contradicts it --');
{
  const confirmed = makeConfirmation({ inference: 'saving', subject: 'own:1', answer: true });
  const declined = makeConfirmation({ inference: 'saving', subject: 'own:2', answer: false });
  const set = resolvedSet(['own:2', 'own:3'], [confirmed, declined], 'saving');
  note(set.has('own:1'), 'an account confirmed as saving stays so when the detector stops seeing it');
  note(!set.has('own:2'), 'an account declined is gone whatever the detector says');
  note(set.has('own:3'), 'and an unanswered account is left to inference');
}

console.log('\n -- answering twice replaces, and a flip can be put back --');
{
  const first = applyAnswer([], { inference: 'saving', subject: 'bank:1234', answer: true });
  const second = applyAnswer(first.confirmations, {
    inference: 'saving',
    subject: 'bank:1234',
    answer: false,
  });
  note(second.confirmations.length === 1, 'one subject keeps exactly one answer');
  note(second.prior && second.prior.answer === true, 'the displaced answer is handed back for undo');
  note(second.record.createdAt === first.record.createdAt, 'and the original answer date is kept');
  note(confirmedSubjects(second.confirmations, 'saving').length === 0, 'the live answer is the new one');
  note(
    answeredAny(second.confirmations, 'saving') && !answeredAny([], 'saving'),
    'and "answered no" stays distinguishable from "never asked" - the plan drawer reads exactly this'
  );
}

/* ------------------------------------------------------------------------
   MIGRATION - nobody's existing answers may be lost
   ------------------------------------------------------------------------ */
console.log('\n -- the three retired mechanisms move across intact --');
{
  const moved = migrateLegacyConfirmations({
    incomeIds: ['bank-1'],
    refundIds: ['bank-2'],
    reviewIds: ['card-1'],
    savingKeys: ['bank:9999'],
  });
  note(moved.length === 4, 'every stored answer becomes a confirmation');
  note(isConfirmed(moved, 'income', ['bank-1']), 'confirmedIncomeIds survives');
  note(isConfirmed(moved, 'refund', ['bank-2']), 'refundIncomeIds survives');
  note(isConfirmed(moved, 'review', ['card-1']), 'a dismissed review survives');
  note(isConfirmed(moved, 'saving', ['bank:9999']), 'an account designation survives');
  note(
    moved.every((c) => c.source === 'person'),
    'and each arrives marked as a person’s answer, not a guess'
  );

  const newer = makeConfirmation({ inference: 'income', subject: 'bank-1', answer: false });
  const again = migrateLegacyConfirmations({ incomeIds: ['bank-1'] }, [newer]);
  note(
    answerFor(again, 'income', ['bank-1']) === false,
    'running the move again cannot overwrite a newer answer with a stale legacy one'
  );
  note(migrateLegacyConfirmations({}, again).length === again.length, 'and it is idempotent');
}

console.log('\n -- junk from a file or an older build is refused, not trusted --');
{
  const cleaned = sanitiseConfirmations([
    null,
    { inference: 'nonsense', scope: 'transaction', subject: 'x', answer: true },
    { inference: 'income', scope: 'galaxy', subject: 'x', answer: true },
    { inference: 'income', scope: 'transaction', subject: '', answer: true },
    { inference: 'income', scope: 'transaction', subject: 'ok', answer: 1, source: 'detector' },
    { inference: 'income', scope: 'transaction', subject: 'ok', answer: true },
  ]);
  note(cleaned.length === 1 && cleaned[0].subject === 'ok', 'only well-formed answers survive');
  note(cleaned[0].source === 'person', 'and nothing can claim to be an answer the app made itself');
}

console.log('\n -- removing a statement takes its transaction answers, not the standing ones --');
{
  const kept = pruneConfirmations(
    [
      makeConfirmation({ inference: 'income', subject: 'gone', answer: true }),
      makeConfirmation({ inference: 'income', subject: 'here', answer: true }),
      makeConfirmation({ inference: 'transfer', subject: 'own:7485', answer: false }),
      makeConfirmation({ inference: 'saving', subject: 'own:1', answer: true }),
    ],
    ['here']
  );
  note(kept.length === 3, 'the answer about the removed transaction goes with it');
  note(!kept.some((c) => c.subject === 'gone'), 'specifically that one');
  note(
    kept.some((c) => c.subject === 'own:7485') && kept.some((c) => c.subject === 'own:1'),
    'a payee or account answer is a standing fact and survives re-import'
  );

  const plan = buildStatementRemovalPlan(
    {
      records: [{ id: 'c-1', source_file: 'card.pdf' }],
      bankRecords: [{ id: 'b-1', source_file: 'bank.pdf' }],
      confirmations: [
        makeConfirmation({ inference: 'income', subject: 'b-1', answer: true }),
        makeConfirmation({ inference: 'review', subject: 'c-1', answer: true }),
        makeConfirmation({ inference: 'transfer', subject: 'own:7485', answer: false }),
      ],
    },
    'bank.pdf',
    'bank'
  );
  note(
    !plan.state.confirmations.some((c) => c.subject === 'b-1'),
    'the real removal cascade prunes through the same door'
  );
  note(
    plan.state.confirmations.some((c) => c.subject === 'c-1'),
    'and leaves the other ledger’s answers alone'
  );
}

/* ------------------------------------------------------------------------
   READ WHEREVER THE INFERENCE IS CONSUMED
   ------------------------------------------------------------------------ */
console.log('\n -- the bank ledger reads the same answers --');
{
  const rows = [
    { id: 'd1', direction: 'in', type: 'ABM DEPOSIT', description: 'ABM DEPOSIT', amount: 5000 },
    { id: 'r1', direction: 'in', type: 'REFUND', description: 'REFUND', amount: 900 },
  ];
  const plain = applyLedgerRules(rows, { confirmations: [] });
  note(plain[0].excludedFromIncome, 'an unanswered machine deposit is kept out of income');
  note(plain[1].refund, 'and an unanswered reversal reads as money returned');

  const answered = applyLedgerRules(rows, {
    confirmations: [
      makeConfirmation({ inference: 'income', subject: 'd1', answer: true }),
      makeConfirmation({ inference: 'refund', subject: 'r1', answer: true }),
    ],
  });
  note(!answered[0].excludedFromIncome, 'saying it is income counts it as income');
  note(!answered[1].refund, 'saying the reversal is income counts it too');
}

console.log('\n -- a review is resolved from the store, not from the transaction --');
{
  const records = [{ id: 'c-1', description: 'SOMEWHERE', txn_date: '2026-06-01', amount: 100 }];
  const before = buildRows(records, [], { confirmations: [] });
  const after = buildRows(records, [], {
    confirmations: [makeConfirmation({ inference: 'review', subject: 'c-1', answer: true })],
  });
  note(before[0].reviewDismissed === false, 'nothing is marked reviewed by default');
  note(after[0].reviewDismissed === true, 'and the answer is what marks it, wherever it was given');
}

console.log('\n -- what is fixed comes from the category, not a second answer --');
{
  const cfg = {};
  const months = ['2026-03', '2026-04', '2026-05', '2026-06'];
  const rent = months.map((m, i) => ({
    id: `rent-${i}`,
    date: `${m}-14`,
    direction: 'out',
    amount: 60000,
    currency: 'JMD',
    category: 'Rent',
    counterpartyKey: 'ext:LANDLORD',
    counterpartyLabel: 'Landlord',
  }));
  // Repeats as steadily as the rent does, so detection alone cannot tell them
  // apart - only the person's own placement of the category can.
  const gym = months.map((m, i) => ({
    id: `gym-${i}`,
    date: `${m}-02`,
    direction: 'out',
    amount: 9000,
    currency: 'JMD',
    category: 'Fitness',
    counterpartyKey: 'ext:GYM',
    counterpartyLabel: 'Gym',
  }));
  const bank = [...rent, ...gym];
  const period = { from: '2026-06-01', to: '2026-06-30' };

  const unplaced = committedFlexible({ bankRecords: bank, cfg, period });
  note(
    unplaced.committed === 69000,
    'with nothing placed, detection decides - both repeating payments read as committed'
  );

  const placed = committedFlexible({
    bankRecords: bank,
    cfg,
    period,
    groupAssignments: { Rent: 'fixed', Fitness: 'free' },
  });
  note(placed.committed === 60000, 'placing Rent in Fixed expenses keeps it committed');
  note(
    placed.flexibleSpent === 9000,
    'and placing Fitness in Discretionary spending moves it out, however regularly it repeats'
  );

  console.log('\n -- which repeating credit is "your pay" --');
  {
    // Two credits repeat steadily. The bigger one is a regular transfer from a
    // relative; the smaller is the salary. Detection cannot tell them apart,
    // and the one it picks sets the payday, which sets the window of payments
    // counted before it, which sets Overview's lead figure.
    const payMonths = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
    const credit = (key, label, day, amount) =>
      payMonths.map((m, i) => ({
        id: `${key}-${i}`,
        date: `${m}-${day}`,
        direction: 'in',
        amount,
        currency: 'JMD',
        counterpartyKey: key,
        counterpartyLabel: label,
      }));
    const bankIn = [
      ...credit('ext:FAMILY', 'Transfer from family', '05', 300000),
      ...credit('ext:SALARY', 'Salary', '25', 250000),
    ];
    const opts = resolveOpts(cfg);
    const asOf = '2026-09-10';

    note(payCandidates(bankIn, opts, asOf).length === 2, 'both repeating credits are candidates');

    const guessed = expectedIncome(bankIn, opts, asOf, []);
    note(
      guessed.key === 'ext:FAMILY' && guessed.chosenBy === 'size',
      'with no answer the app takes the largest, and says that is what it did'
    );
    note(
      guessed.otherCandidates === 1,
      'and reports how many it was choosing between, so a surface can be honest about it'
    );

    const answered = expectedIncome(
      bankIn,
      opts,
      asOf,
      applyAnswer([], { inference: 'pay', subject: 'ext:SALARY', answer: true }).confirmations
    );
    note(
      answered.key === 'ext:SALARY' && answered.chosenBy === 'person',
      'a payee answered yes is the pay whatever its size'
    );
    note(answered.date.endsWith('-25'), 'and the payday moves to that payee\u2019s own day');

    const ruledOut = expectedIncome(
      bankIn,
      opts,
      asOf,
      applyAnswer([], { inference: 'pay', subject: 'ext:FAMILY', answer: false }).confirmations
    );
    note(ruledOut.key === 'ext:SALARY', 'and a payee answered no is out of the running');

    // The guess is named where the figure it moves is explained, and only when
    // there was actually a choice to get wrong.
    const modelOf = (records) =>
      buildAvailableNowModel(
        commitmentAndIncomePrimitive({ bankRecords: records, cfg, asOf }),
        cfg
      );
    const cashDetail = (m) =>
      (m.working.find((w) => w.id === 'availableBalance') || {}).detail || '';
    note(
      /largest of 2 payments that repeat like this/.test(cashDetail(modelOf(bankIn))),
      'the cash forecast says the payday was a guess, and how many it chose between'
    );
    const single = credit('ext:SALARY', 'Salary', '25', 250000);
    note(
      !/repeat like this/.test(cashDetail(modelOf(single))),
      'and stays silent when there was only ever one candidate'
    );
  }

  // The point of the whole exercise: rent paid by bank transfer, filed as Rent,
  // is a fixed expense for the same reason rent paid any other way is.
  const oneOff = committedFlexible({
    bankRecords: [
      {
        id: 'rent-single',
        date: '2026-06-14',
        direction: 'out',
        amount: 60000,
        currency: 'JMD',
        category: 'Rent',
        counterpartyKey: 'ext:NEW LANDLORD',
      },
    ],
    cfg,
    period,
    groupAssignments: { Rent: 'fixed' },
  });
  note(
    oneOff.committed === 60000,
    'a transfer with no history at all counts as fixed once it is filed under a fixed category'
  );
}

console.log('\n -- a transfer the app read as your own account can be handed back --');
{
  const rows = [
    {
      id: 't-1',
      date: '2026-06-01',
      direction: 'out',
      amount: 60000,
      description: 'THIRD PARTY TRANSFER 7485',
      account: '000000007485',
    },
  ];
  const inferred = classifyInternalTransfers(rows, [], [], null, []);
  note(inferred[0].internalTransfer === true, 'a number matching one of your accounts reads as yours');
  note(inferred[0].transferKey === 'own:7485', 'and the row carries the key the question is asked about');

  const corrected = classifyInternalTransfers(rows, [], [], null, [
    makeConfirmation({ inference: 'transfer', subject: 'own:7485', answer: false }),
  ]);
  note(corrected[0].internalTransfer === false, 'saying it is someone else puts the money back into spending');
  note(
    corrected[0].counterpartyKey !== 'own:7485' && !/^Account /.test(corrected[0].counterpartyLabel),
    'and the row stops calling that person one of your accounts'
  );
  note(
    corrected[0].transferKey === 'own:7485',
    'the question keeps its original subject, so the answer never stops matching its own row'
  );

  const elsewhere = [
    { id: 't-2', date: '2026-06-02', direction: 'out', amount: 500, description: 'TRF TO SAVINGS CO' },
  ];
  const unclaimed = classifyInternalTransfers(elsewhere, [], [], null, []);
  note(unclaimed[0].internalTransfer === false, 'an account the app has never seen reads as somebody else');
  const claimed = classifyInternalTransfers(elsewhere, [], [], null, [
    makeConfirmation({ inference: 'transfer', subject: unclaimed[0].transferKey, answer: true }),
  ]);
  note(claimed[0].internalTransfer === true, 'and it can be claimed as yours - an account at another bank still is one');
}

/* ------------------------------------------------------------------------
   THE GUARD - no inference may grow its own confirmation store again
   ------------------------------------------------------------------------ */
console.log('\n -- one store, one writer, and no fourth mechanism --');
{
  const appDir = join(ROOT, 'application');
  const sources = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js'))
        sources.push([full.slice(ROOT.length + 1), readFileSync(full, 'utf8')]);
    }
  };
  walk(appDir);
  note(sources.length > 40, `every application module is scanned (${sources.length})`);

  // 1) ONE WRITER. Only the writer records an answer. The boot path may replace
  //    the store once, to finish moving the retired mechanisms across.
  const WRITERS = new Set(['application/ui/confirm-control.js', 'application/app-controller.js']);
  const writes = sources.filter(
    ([file, src]) =>
      !WRITERS.has(file) && /Store\.confirmations\.(put|putMany|replace|delete)\s*\(/.test(src)
  );
  note(writes.length === 0, `nothing outside the writer records an answer${writes.length ? ' - ' + writes.map(([f]) => f).join(', ') : ''}`);
  const control = readFileSync(join(ROOT, 'application', 'ui', 'confirm-control.js'), 'utf8');
  const applied = sources.filter(([file, src]) => /\bapplyAnswer\s*\(/.test(src) && file !== 'application/ui/confirm-control.js' && file !== 'application/analysis/confirmations.js');
  note(applied.length === 0, 'and nothing outside it builds an answer record by hand');

  // 2) NO PRIVATE STORE. The shapes the retired mechanisms used, in any new
  //    spelling: a list of confirmed/dismissed ids, or a meta key that means
  //    the same thing.
  const PRIVATE_SHAPE = /\b[A-Za-z]*(?:[Cc]onfirmed|[Dd]ismissed|[Aa]cknowledged|[Aa]pproved)[A-Za-z]*(?:Ids|Keys|List|Set)\b/;
  // Two files may still NAME the retired shapes: the module that documents what
  // it replaced, and the two readers that carry an older stored file or device
  // across. Check 3 below proves neither of them keeps one alive as live state.
  const LEGACY_READERS = new Set([
    'application/analysis/confirmations.js',
    'application/app-controller.js',
    'application/output/history-codec.js',
  ]);
  const shapes = sources.filter(
    ([file, src]) => !LEGACY_READERS.has(file) && PRIVATE_SHAPE.test(src)
  );
  note(
    shapes.length === 0,
    `no module keeps its own list of confirmed or dismissed ids${shapes.length ? ' - ' + shapes.map(([f]) => f).join(', ') : ''}`
  );
  // A dismissed banner or a shown-once hint is not an answer about an
  // inference, so those names are exempt by construction rather than by file.
  const META_SHAPE =
    /setMeta(?:Many)?\([\s\S]{0,160}?'(?![A-Za-z]*(?:Prompt|Banner|Hint|Notice|Nudge|install))[A-Za-z]*(?:Confirmed|Dismissed|SetAside)[A-Za-z]*'/;
  const metas = sources.filter(
    ([file, src]) => file !== 'application/app-controller.js' && META_SHAPE.test(src)
  );
  note(
    metas.length === 0,
    `no answer is stored under a meta key of its own${metas.length ? ' - ' + metas.map(([f]) => f).join(', ') : ''}`
  );

  // 3) THE RETIRED NAMES ARE GONE as live state, and survive only as the
  //    one-off reader that moves them across.
  const controller = readFileSync(join(ROOT, 'application', 'app-controller.js'), 'utf8');
  for (const dead of ['state.confirmedIncomeIds', 'state.refundIncomeIds', 'state._planSetAside']) {
    note(
      sources.every(([, src]) => !src.includes(dead)),
      `${dead} no longer exists anywhere`
    );
  }
  const codec = readFileSync(join(ROOT, 'application', 'output', 'history-codec.js'), 'utf8');
  note(
    /legacyConfirmations/.test(codec) && !/confirmedIncomeIds:/.test(codec),
    'a backup written from here carries confirmations only; the old shape is read, never written'
  );
  note(
    /function loadConfirmations\(\)/.test(controller) &&
      /bankConfirmedIncomeIds/.test(controller) &&
      /planSetAside/.test(controller),
    'the legacy keys are read exactly once, by the migration, so nothing stored is lost'
  );
  note(
    /Store\.setMetaMany\(\[[\s\S]{0,400}?value: null[\s\S]{0,400}?\]\)/.test(controller),
    'and cleared once their contents are safely confirmations, so there is one store and not two'
  );

  // 4) EVERY REGISTERED INFERENCE IS ACTUALLY READ through the shared reader,
  //    somewhere other than the module that defines it.
  const READERS = /(answerFor|isConfirmed|isDeclined|hasAnswered|confirmedSubjects|answeredAny|resolvedSet)\s*\(/;
  const consumers = sources.filter(
    ([file, src]) => file !== 'application/analysis/confirmations.js' && READERS.test(src)
  );
  note(consumers.length >= 5, `the shared reader is used by ${consumers.length} modules, not one`);
  for (const inference of Object.keys(CONFIRMABLE)) {
    note(
      consumers.some(([, src]) => new RegExp(`'${inference}'`).test(src)) ||
        control.includes(`'${inference}'`),
      `the ${inference} inference reads its answer from the shared store`
    );
  }

  // 5) EVERY ANSWER CARRIES A WAY BACK, through the existing toast-undo idiom.
  note(
    /commitAndRender\(/.test(control) && /toast\('Put back\.'\)/.test(control),
    'every answer is committed, rendered and then announced with an undo beside it'
  );
  note(
    /const back = prior/.test(control),
    'and undoing a changed answer restores the previous one rather than erasing it'
  );

  // 6) ONE DOOR. Every row-answerable inference is reachable from the control
  //    a person already uses to say how a transaction is filed - the category
  //    tag - and not from a second affordance invented beside it.
  const activity = readFileSync(join(ROOT, 'application', 'ui', 'activity-render.js'), 'utf8');
  const picker = readFileSync(join(ROOT, 'application', 'ui', 'category-picker.js'), 'utf8');
  note(
    /openCategoryPicker\(r, 'card'\)/.test(activity) && /openCategoryPicker\(r, 'bank'\)/.test(activity),
    'the category tag opens the same dialog on both ledgers, so no row is inert'
  );
  note(
    !/confirmSections\(row, 'card'\)/.test(picker) && !/confirmSections\(row, 'bank'\)/.test(picker),
    'the filing dialog stays focused on choosing and applying a category'
  );
  note(
    !/confirmRowControls/.test(activity),
    'nothing offers them a second time beside the row'
  );
  // The answer builders, from the shared one-line control to the end of the
  // file: an inference registered as row-answerable has to be named in there,
  // not merely mentioned in a comment somewhere above it.
  const builders = control.slice(control.indexOf('function line('));
  for (const [name, spec] of Object.entries(CONFIRMABLE)) {
    if (!spec.row) continue;
    note(
      new RegExp(`'${name}'`).test(builders),
      `${name} can be answered from the transaction it is about`
    );
  }
  note(
    /setBankCategory/.test(picker) && /upsertCategoryRule/.test(picker),
    'a bank transfer can be filed under a category, which is how rent paid by transfer becomes a fixed expense'
  );
  /* WRITER AND READER AGREE ON WHAT IDENTIFIES A BANK ROW.
   *
   * A tenth of a real bank ledger prints no description - INTEREST PAYMENT,
   * WITHHOLDING TAX, GCT/GOVT TAX - and the type IS the row. The categoriser has
   * always fallen back to it; the picker read row.description on its own, wrote
   * an empty match that cleanRule silently dropped, and told the person their
   * rule had been filed. */
  const bankCat = readFileSync(join(ROOT, 'application', 'analysis', 'bank-categorise.js'), 'utf8');
  note(
    /export function bankRuleMatch/.test(bankCat) &&
      /const description = bankRuleMatch\(r\);/.test(bankCat) &&
      /const match = bankRuleMatch\(row\);/.test(picker),
    'the rule keys on the same expression the categoriser reads it back with'
  );
  note(
    /if \(!merged\.inserted && !merged\.updated\)/.test(picker) && /if \(!match\)/.test(picker),
    'and a rule that was not written is never announced as written'
  );
  const cf = readFileSync(join(ROOT, 'application', 'analysis', 'committed-flexible.js'), 'utf8');
  note(
    /groupForCategory/.test(cf) && /groupAssignments/.test(cf),
    'and what counts as fixed is read from the plan bands the person already owns'
  );
  note(
    !/'fixed'/.test(control) && !sources.some(([f, src]) => f !== 'application/analysis/confirmations.js' && /inference: 'fixed'/.test(src)),
    'with no second per-payee answer for fixed anywhere, which is what made two answers to one question'
  );
  note(
    !/name="confirm-scope/.test(control),
    'and no answer asks a person to pick a scope as well as an answer'
  );
  // Every answer is put as a question. A bare noun with two chips beside it -
  // "Review", "Own account", "Income" - is the app's own filing vocabulary and
  // leaves a person guessing both what is being asked and which way round the
  // answer runs.
  const asked = [...control.matchAll(/return line\(\s*[`']([^`']+)[`']/g)].map((m) => m[1]);
  note(asked.length >= 4, `every answer is built through the one line helper (${asked.length})`);
  note(
    asked.every((q) => q.trim().endsWith('?')),
    `and each one reads as a question${asked.some((q) => !q.trim().endsWith('?')) ? ' - NOT: ' + asked.filter((q) => !q.trim().endsWith('?')).join(', ') : ''}`
  );
  note(
    /openRulesSection/.test(picker) && /Manage rules/.test(picker),
    'a dialog that writes a rule offers the way to go and see those rules'
  );

  // 7) ONE SHAPE, not just one store. Review & adjustments wrote through the
  //    shared writer but asked in its own words, with a "Count as income"
  //    button and an "Undo" tucked in a second fold - and no way at all to
  //    answer NO, so a settled question stayed an open guess. It now renders
  //    the same question line the dialog renders, from the same builder.
  const accounts = readFileSync(join(ROOT, 'application', 'ui', 'accounts-render.js'), 'utf8');
  note(
    /confirmQuestion\(r\)/.test(accounts),
    'the review card asks through the shared question builder'
  );
  note(
    !/'Count as income'/.test(accounts) && !/confirmDepositAsIncome|confirmRefundAsIncome/.test(accounts),
    'and keeps no control of its own for the same answer'
  );
  note(
    /incomeQuestion/.test(control) && /function incomeQuestion/.test(control),
    'which the one writer exports rather than the card rebuilding it'
  );
  note(
    /const deposits = pending\(recs\.filter\(\(r\) => r\.cashDeposit\), 'income'\);/.test(accounts) &&
      !/excludedFromIncome/.test(accounts),
    'answered and unanswered rows sit in one list, so no answer has to be dug out of a second fold'
  );
  note(
    /\.\.\.rows\.filter\(\(r\) => !answered\(r, inference\)\),\s*\n\s*\.\.\.rows\.filter\(\(r\) => answered\(r, inference\)\),/.test(accounts),
    'with the unanswered ones first, so the count in the summary is what you see'
  );

  // 8) ONE MECHANISM for "every transaction like this". Filing to all used to
  //    write the rule AND stamp a categoryOverride on every matching record.
  //    The stamp outranks the rule, so the rule could never afterwards be
  //    corrected, removed, or honestly listed.
  note(
    /rec\.categoryOverride = applyAll \? null : category;/.test(picker),
    'filing every transaction like this writes the rule and clears the per-row stamps it would outrank'
  );
  const settings = readFileSync(join(ROOT, 'application', 'app-controller.js'), 'utf8');
  note(
    /function personalRulesSection\(\)/.test(settings) && /listCategoryRules/.test(settings),
    'and the rules a person has written can be seen where "Manage rules" lands'
  );
  note(
    /removeCategoryRule/.test(settings) && /'Put back\.'/.test(settings),
    'each one can be dropped, reversibly, like every other correction'
  );
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: one stored shape for every "the person told us this", one writer,');
console.log('         read wherever the inference is consumed, reversible, and guarded');
console.log('         against any inference growing a private confirmation store again.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
