import { staggerIn } from './motion.js';
import { commitAndRender } from './reversible.js';
import { createDecisionHeader, placeFoldAll } from './decision-header.js';
import { collapsibleCardReact, chartInfoReact, decisionSurfaceReact, positionSummaryReact, positionAssetFormReact, emptyStateReact, netWorthLineReact, positionCashAccountsReact, positionMixReact, positionNetWorthReact, positionViewReact } from './react-bridge.js';
import { pairCards } from './chart-helpers.js';
import { createAccountRename } from './account-rename.js';
/*
 * PROVENANCE RULE (applies to every render surface, not just this file):
 * The reconciled default is SILENT - a figure from statements is just the
 * number, never labelled "from statements" / "reconciled" / "as of X" on the
 * row. Trustworthiness is the app's baseline promise, stated once in the
 * footer, never re-asserted per line. Only a DEPARTURE from that default
 * carries a minimal mark: self-reported (a quiet cue + Remove), stale ("may be
 * out of date"), or estimated (the "≈" glyph). The full working lives behind
 * the existing "Why"/detail dropdown and in the export ONLY - a banker reading
 * pasted text has no dropdown and needs the words; the interface does not.
 * Do not print where-a-number-came-from as row text; encode it as state. A
 * label is also redundant when another visual element already encodes it: a
 * signed, coloured amount already says inflow vs outflow, so no "Cash inflow /
 * Cash outflow" word is printed beside it.
 *
 * position-render.js  -  the "Position" destination (fourth tab). Renders the
 * proven position models (cash & debt, coverage-based net worth, financial-
 * position summary) via the shared number -> tag -> dropdown content model.
 *
 * Follows the app's established render-factory pattern EXACTLY: constructed once
 * in bootUI, receives the members it uses via one ctx object, fails loudly at
 * construction (requireCtx) if a dependency is missing, and returns the one
 * name render() calls (renderPosition). It owns no analysis - every figure
 * comes from provenModels.positionModels(), which is corpus-proven; this file
 * only turns that model into DOM.
 *
 * INTEGRITY, ENFORCED IN THE MARKUP (not just the model):
 *   - reconciled figures (cash, card, income stability) render as authoritative
 *     content-model cards;
 *   - the recorded net worth NEVER shows a bare "complete" total: its own note
 *     names the gaps;
 *   - self-reported lines are visually separated from reconciled ones and a
 *     stale entry is flagged;
 *   - the summary export keeps each figure's source, and is labelled a personal
 *     summary, not a lender-approved statement.
 */
import {
  requireCtx,
  formatDisplayDate,
  formatMoney,
  withExactFigures,
  figuresHidden,
  accountName,
  accountNameKey,
  accountShortLabel,
  bankAccountIdentity,
  daysBetweenIso,
  isoToday,
} from '../core/shared-helpers.js';
import { currencyPrefix, makeProseMoney } from '../core/money-format.js';
import { INVESTMENT_PROVIDER_LABELS, investmentSnapshot } from '../analysis/investments.js';
import { renderShareBar } from '../analysis/reporting-core.js';
import { balanceKey, NUDGE_AFTER_DAYS } from '../analysis/balance-updates.js';
import { iconStore as storeGlyph } from '../core/icons.js';

export function createPositionRenderer(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      'icon',
      'provenModels',
      'trackUsage',
      'Store',
      'render',
      'makeManualAsset',
      'NET_WORTH_CLASSES',
      'toast',
      'drillToAccount',
      'pickStatements',
      'renderInvestments',
      'moneyShort',
      'changeSetting',
      'balanceUpdates',
      'openEvidence',
    ],
    'createPositionRenderer'
  );
  const {
    state,
    el,
    icon,
    provenModels,
    trackUsage,
    Store,
    render,
    makeManualAsset,
    NET_WORTH_CLASSES,
    drillToAccount,
    pickStatements,
    renderInvestments,
    moneyShort,
    changeSetting,
    balanceUpdates,
    openEvidence,
  } = ctx;
  const iconStore = ctx.iconStore || storeGlyph;
  const toast = ctx.toast || (() => {});
  const { renderDecisionHeader } = createDecisionHeader({ el });

  function cashAccounts(cashDebt) {
    const perAccount = cashDebt && cashDebt.perAccount ? cashDebt.perAccount : {};
    return Array.isArray(cashDebt && cashDebt.accounts)
      ? cashDebt.accounts.slice()
      : Object.entries(perAccount).map(([account, balance]) => ({
          account,
          currency: cashDebt.baseCurrency,
          nativeBalance: Number(balance) || 0,
          baseBalance: Number(balance) || 0,
        }));
  }

  const { renameControl } = createAccountRename({ state, el, changeSetting, trackUsage, track: 'position-rename-account' });

  function renderCashDebt(cashDebtModel, cashDebt, asProps = false) {
    const accounts = cashAccounts(cashDebt);
    // One account normally needs no per-account breakdown - but a balance the
    // person typed lives on these rows (its date, and the way back to fix it),
    // so the card stays reachable as soon as one exists.
    if (accounts.length <= 1 && !accounts.some((account) => account.enteredAsOf)) return null;
    const accountMoney = ctx.bankMoney || ctx.money0 || ((n) => String(n));
    const base = cashDebt.baseCurrency || 'JMD';
    const comparableAccounts = accounts.filter((account) => Number.isFinite(account.baseBalance));
    const positiveAccounts = comparableAccounts.filter((account) => Number(account.baseBalance) > 0);
    const representedCash = comparableAccounts.reduce(
      (sum, account) => sum + Number(account.baseBalance),
      0
    );
    const baseCash = comparableAccounts
      .filter((account) => (account.currency || base) === base)
      .reduce((sum, account) => sum + Number(account.baseBalance), 0);
    const positiveCash = positiveAccounts.reduce(
      (sum, account) => sum + Number(account.baseBalance),
      0
    );
    const unconverted = accounts.filter((account) => account.baseBalance == null).length;

    /* The rate the figures above were converted at, said here. */
    function conversionNote() {
      const rated = accounts.filter(
        (account) => (account.currency || base) !== base && Number(account.rate) > 0
      );
      if (!rated.length)
        return 'Accounts held in another currency are converted to your base currency before they are added up.';
      const seen = new Map();
      for (const account of rated) seen.set(account.currency, account.rate);
      return `Converted at ${[...seen].map(([ccy, rate]) => `${rate} ${base} to 1 ${ccy}`).join(', ')}.`;
    }

    /* THE WAY IN, ON THE ROW THE FIGURE IS ON.
     *
     * A balance the person typed already carried "entered <date> · Fix". A
     * balance read off a statement carried nothing - so the one figure that
     * actually goes stale, and the one they would most want to correct, was the
     * one with no way to correct it from here. On the real set that is the
     * account holding 73% of the cash, showing a figure from a statement seven
     * weeks old. Offered only once it IS stale, by the app's own freshness rule,
     * and through openUpdater - the door that already exists. */
    const balanceState = (account) => {
      const model = provenModels.balances();
      if (!model || !model.accounts) return null;
      const key = balanceKey('bank', account.account, account.currency || base);
      return model.accounts.find((item) => item.key === key) || null;
    };
    const staleSince = (account) => {
      const found = balanceState(account);
      if (!found || found.source !== 'statement' || !found.asOf) return null;
      const age = daysBetweenIso(found.asOf, isoToday());
      return age != null && age > NUDGE_AFTER_DAYS ? found.asOf : null;
    };
    const belowZero = comparableAccounts.filter((account) => Number(account.baseBalance) < 0).length;
    const accountLabel = (account) => accountShortLabel(account, accounts);
    const currencyMoney = (account) => {
      if ((account.currency || base) === base) return accountMoney(account.nativeBalance);
      return formatMoney(
        Number(account.nativeBalance) || 0,
        currencyPrefix(account.currency, state.cfg),
        undefined,
        2
      );
    };

    const summaryNote = unconverted
      ? `Plus ${unconverted} account${unconverted === 1 ? '' : 's'} kept in its own currency`
      : belowZero
        ? `${belowZero} account${belowZero === 1 ? ' is' : 's are'} below zero and shown separately`
        : '';
    const conversionInfoText = summaryNote ? null : conversionNote();
    const conversionInfo = typeof window === 'undefined' && conversionInfoText ? chartInfoReact(el, 'How this is converted', conversionInfoText) : null;
    let shareNode = null;
    if (positiveAccounts.length > 1) {
      shareNode = renderShareBar(el, {
        palette: ['var(--accent)', 'var(--chart-in)', 'var(--good)', 'var(--warn)'],
        segments: positiveAccounts
          .slice()
          .sort((a, b) => b.baseBalance - a.baseBalance)
          .map((account) => ({
            amount: Number(account.baseBalance),
            label: `${accountName(state.accountNames, 'bank', account.account) || accountLabel(account.account)} · ${account.currency || base}`,
          })),
      });
    }

    const accountRows = accounts.slice().sort((a, b) => {
      const av = a.baseBalance == null ? -Infinity : Number(a.baseBalance);
      const bv = b.baseBalance == null ? -Infinity : Number(b.baseBalance);
      return bv - av;
    }).map((account, index) => {
      const converted = (account.currency || base) !== base && account.baseBalance != null;
      const share = positiveCash > 0 && Number(account.baseBalance) > 0
        ? Math.max(0, Math.min(100, (Number(account.baseBalance) / positiveCash) * 100))
        : null;
      const name = accountName(state.accountNames, 'bank', account.account) || accountLabel(account.account);
      const stale = account.enteredAsOf ? null : staleSince(account);
      return {
        key: balanceKey('bank', account.account, account.currency || base),
        activityFocusId: `position-account-open-${index}`,
        name,
        currency: account.currency || base,
        amount: currencyMoney(account),
        convertedText: converted ? `≈ ${accountMoney(account.baseBalance)} ${base}` : (account.currency || base) === base ? base : 'Kept separate',
        ...renameControl({
          kind: 'bank',
          account: account.account,
          fallback: accountLabel(account.account),
          about: `Account ending ${bankAccountIdentity(account.account)}`,
          textClass: 'position-account-name',
        }),
        onOpen: () => {
          trackUsage('position-drill-account');
          drillToAccount(account.account);
        },
        shareText: share == null ? '' : figuresHidden() ? '••% of represented cash' : `${Math.round(share)}% of represented cash`,
        shareWidth: share == null ? 0 : Math.max(2, Math.round(share)),
        dateText: account.enteredAsOf
          ? `entered ${formatDisplayDate(account.enteredAsOf)}`
          : stale
            ? `from your ${formatDisplayDate(stale)} statement`
            : '',
        updateLabel: account.enteredAsOf ? `Fix the balance entered for ${name}` : `Type today's balance for ${name}`,
        updateText: account.enteredAsOf ? 'Fix' : 'Update',
        onUpdate: () => balanceUpdates.openUpdater(balanceKey('bank', account.account, account.currency || base)),
      };
    });
    const investmentAccounts = investmentSnapshot(state._investmentStatements || [], { baseCurrency: base }).availableAccounts;
    const namedInvestmentAccounts = investmentAccounts.map((item) => ({
      key: accountNameKey('investment', item.accountKey),
      ...renameControl({
        kind: 'investment',
        account: item.accountKey,
        fallback: item.label,
        about: `${INVESTMENT_PROVIDER_LABELS[item.provider] || item.provider} investment account ending ${bankAccountIdentity(item.account)}`,
      }),
    }));

    // ONE cash figure, whichever screen asks.
    //
    // This card summed every account converted into the base currency, while
    // "Cash on hand" - Overview's lead working, and this screen's own
    // supporting metric - counts the base currency alone and says so ("plus
    // USD separate"). Two totals for one idea, one of them now the destination
    // the other opens. The summary leads with the shared figure and names the
    // foreign accounts beside it rather than folding them in silently; the
    // rows below still show every account, in its own currency.
    const foreignAccounts = accounts.filter((account) => (account.currency || base) !== base);
    const cashProps = {
      representedText: accountMoney(representedCash),
      base,
      summaryNote,
      conversionInfo,
      conversionInfoText,
      shareNode,
      accounts: accountRows,
      investmentAccounts: namedInvestmentAccounts,
    };
    const reactActive = typeof window !== 'undefined';
    const sec = reactActive ? null : positionCashAccountsReact(el, cashProps);
    const summary = foreignAccounts.length
      ? `${moneyShort(baseCash)} in ${base}, plus ${foreignAccounts.length} account${foreignAccounts.length === 1 ? '' : 's'} in another currency`
      : `${moneyShort(representedCash)} in ${accounts.length} accounts`;
    const explain = `Every everyday account, at its latest recorded balance. ${conversionNote()} The credit card is a debt, so it is not part of this figure.`;
    if (asProps) return { summary, explain, cashProps };
    return collapsibleCardReact(el, {
      title: 'Where your cash sits',
      summary,
      // The one thing this card cannot say on its face: what the figure on it
      // counts, and what it leaves out. Its glyph opens it now rather than
      // being an info icon that opened nothing.
      explain,
      body: sec,
      reactBody: reactActive ? { kind: 'positionCash', props: cashProps, rootClass: 'pfa-react-root' } : null,
      name: 'position-cashdebt-card',
    });
  }

  function renderNetWorth(nwModel, nw, asProps = false) {
    const reactActive = typeof document !== 'undefined' && typeof window !== 'undefined';
    const totA = Number(nw && nw.totalAssets) || 0;
    const totL = Number(nw && nw.totalLiabilities) || 0;
    const net = Number(nw && nw.recordedNetWorth);
    const netWorth = Number.isFinite(net) ? net : totA - totL;
    const money = ctx.bankMoney || ctx.money0 || ((n) => String(n));
    const proseMoney = makeProseMoney(state.cfg || {});
    const insight = figuresHidden()
      ? 'Recorded net worth is the amount left after recorded debts.'
      : netWorth >= 0 && totA > 0
        ? `${Math.round((netWorth / totA) * 100)}% of recorded assets remain after recorded debts.`
        : `Recorded debts exceed assets by ${proseMoney(Math.abs(netWorth))}.`;

    const lines = nw && nw.lines ? nw.lines : [];


    function renderFilledLine(l) {
      const cls = l.class;
      const isConverted = l.rate != null && l.nativeAmount != null;
      const investmentName = l.accountKey ? accountName(state.accountNames, 'investment', l.accountKey) : null;
      const label =
        (investmentName ? `${cls} · ${investmentName}` : l.label && l.label !== cls ? l.label : cls) +
        (l.currency ? ` (${l.currency})` : '');
      const meta = [];
      if (l.source === 'reconciled') {
        if (l.statementDate) meta.push(`as of ${formatDisplayDate(l.statementDate)}`);
        if (l.rateStale) meta.push('rate may be out of date');
      } else if (l.source === 'entered') {
        meta.push(`entered ${formatDisplayDate(l.asOf)}`);
        if (l.rateStale) meta.push('rate may be out of date');
      } else {
        if (l.stale) meta.push('may be out of date');
        else if (l.lastReviewed) meta.push(formatDisplayDate(l.lastReviewed));
      }
      const amtText = (isConverted ? '\u2248 ' : '') + formatLineAmount(l);
      const rateText = isConverted
        ? `${formatMoney(Number(l.nativeAmount), currencyPrefix(l.currency, state.cfg), undefined, 2)} \u00d7 ${l.rate}${l.rateAsOf ? ` \u00b7 ${l.rateAsOf}` : ''}`
        : '';
      return {
        label,
        meta: meta.join(' \u00b7 '),
        amount: amtText,
        rateText,
        rateClass: 'position-rate-inline',
        stale: l.stale,
        editLabel: `Edit ${label}`,
        inputLabel: l.label || cls,
        inputAmount: Number(l.amount) || 0,
        onSave: l.source === 'self-reported' && l.id ? (values) => saveAsset(l.id, values) : null,
        removeLabel: `Remove ${label}`,
        onRemove: l.source === 'self-reported' && l.id ? () => removeAsset(l.id) : null,
      };
    }

    const assetLines = lines.filter((l) => l.kind === 'asset');
    const debtLines = lines.filter((l) => l.kind === 'liability');

    const lineAmount = (l) => Math.abs(Number(l.amount) || 0);
    const weightedPanel = (title, group, tone) => {
      if (!group.length) return null;
      const total = group.reduce((sum, l) => sum + lineAmount(l), 0) || 1;
      return {
        title,
        tone,
        total: money(total),
        rows: group.map((line, index) => {
          const share = Math.max(0, Math.min(100, (lineAmount(line) / total) * 100));
          const row = renderFilledLine(line);
          return {
            key: line.id || `${line.class}-${index}`,
            line: row,
            ...(reactActive ? {} : { node: netWorthLineReact(el, row) }),
            width: Math.max(2, Math.round(share)),
            shareText: figuresHidden() ? '\u2022\u2022%' : `${Math.round(share)}%`,
          };
        }),
      };
    };

    const panels = [weightedPanel('Assets included', assetLines, 'own'), weightedPanel('Debts included', debtLines, 'owe')].filter(Boolean);
    const onAnimate = (fills) => staggerIn(fills, () => [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      step: 40,
      duration: 460,
    });
    const form = addDisclosureProps();
    if (reactActive) {
      const netWorthProps = {
        insight: totA > 0 || totL > 0 ? insight : null,
        panels,
        onAnimate,
        form,
      };
      if (asProps) return { summary: ((nw && nw.included) || []).join(', ') || 'Recorded details', iconMarkup: iconStore(), netWorthProps };
      return collapsibleCardReact(el, {
        title: 'Recorded assets and debts',
        summary: ((nw && nw.included) || []).join(', ') || 'Recorded details',
        iconMarkup: iconStore(),
        reactBody: { kind: 'positionNetWorth', props: netWorthProps, rootClass: 'pfa-react-root' },
        name: 'position-networth-card',
      });
    }
    const sec = el('div', { id: 'position-networth' });
    if (totA > 0 || totL > 0) sec.append(el('p', { class: 'position-networth-info muted small' }, insight));
    if (panels.length) sec.append(positionMixReact(el, { panels, onAnimate }));
    sec.append(renderAddDisclosure());
    return collapsibleCardReact(el, {
      title: 'Recorded assets and debts',
      summary: ((nw && nw.included) || []).join(', ') || 'Recorded details',
      icon: icon(iconStore()),
      body: sec,
      name: 'position-networth-card',
    });
  }

  function addDisclosureProps() {
    const assetClasses = NET_WORTH_CLASSES.assets.filter((c) => c !== 'Cash & bank');
    const liabilityClasses = NET_WORTH_CLASSES.liabilities.filter((c) => c !== 'Credit card');
    const counts = {};
    for (const item of state.manualAssets || []) {
      const key = `${item.kind === 'liability' ? 'liability' : 'asset'}:${item.class}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    return {
      classes: assetClasses,
      liabilities: liabilityClasses,
      counts,
      iconNode: typeof window === 'undefined' ? icon(iconStore()) : null,
      iconMarkup: typeof window !== 'undefined' ? iconStore() : null,
      onGap: () => trackUsage('position-add-gap'),
      onSave: async ({ kind, cls, name, amount }) => {
        const value = Number(amount);
        if (!(value > 0)) {
          toast('Enter an amount first.');
          return false;
        }
        const rec = makeManualAsset({ class: cls, label: (name || '').trim() || cls, amount: value, kind });
        await commitAndRender({
          commit: async () => {
            await Store.manualAssets.put(rec);
            state.manualAssets = await Store.manualAssets.all();
            trackUsage('position-add-asset');
          },
          render,
          notify: () => toast(`Added ${rec.label}.`),
        });
      },
    };
  }

  function renderAddDisclosure() {
    return positionAssetFormReact(el, addDisclosureProps());
  }

  async function removeAsset(id) {
    if (!id) return;
    const prior = state.manualAssets.find((item) => item.id === id);
    await commitAndRender({
      commit: async () => {
        await Store.manualAssets.delete(id);
        state.manualAssets = await Store.manualAssets.all();
        trackUsage('position-remove-asset');
      },
      render,
      notify: () => toast(prior ? `Removed ${prior.label}.` : 'Removed.', prior ? async () => {
        await commitAndRender({
          commit: async () => {
            await Store.manualAssets.put(prior);
            state.manualAssets = await Store.manualAssets.all();
          },
          render,
          notify: () => toast(`Restored ${prior.label}.`),
        });
      } : null),
    });
  }

  async function saveAsset(id, { label, amount }) {
    const prior = state.manualAssets.find((item) => item.id === id);
    const value = Number(amount);
    if (!prior || !(value > 0)) {
      toast('Enter an amount above zero.');
      return false;
    }
    const next = { ...prior, label: label.trim() || prior.class, amount: value, lastReviewed: isoToday(), updatedAt: new Date().toISOString() };
    await commitAndRender({
      commit: async () => {
        await Store.manualAssets.put(next);
        state.manualAssets = await Store.manualAssets.all();
        trackUsage('position-edit-asset');
      },
      render,
      notify: () => toast(`Updated ${next.label}.`, async () => {
        await commitAndRender({
          commit: async () => {
            await Store.manualAssets.put(prior);
            state.manualAssets = await Store.manualAssets.all();
          },
          render,
          notify: () => toast(`Restored ${prior.label}.`),
        });
      }),
    });
    return true;
  }

  function formatLineAmount(l) {
    const money = ctx.bankMoney || ctx.money0 || ((n) => String(n));
    const v = Number(l.amount) || 0;
    return money(Math.abs(v));
  }

  function renderSummary(summary, balances, asProps = false) {
    const money = ctx.bankMoney || ctx.money0 || ((n) => String(n));
    const props = {
      summary,
      explain: [summary.disclaimer, 'The copied version also includes dates, sources, and coverage.'].filter(Boolean).join(' '),
      balances,
      money,
      figuresHidden: figuresHidden(),
      onCopy: () => {
        copySummary(summary, money);
        trackUsage('position-copy-summary');
      },
    };
    return asProps ? props : positionSummaryReact(props);
  }
  function copySummary(summary, money) {
    // The clipboard artifact keeps FULL provenance the screen dropped: per-row
    // source + period, the named-gaps coverage note, and the fuller disclaimer
    // - a banker reading pasted text has no dropdown and needs the words.
    // Built inside withExactFigures: copying is a deliberate act of sharing
    // real figures, so the privacy gate is suspended for this build even when
    // the screen behind it is showing masked amounts (privacy.js).
    const text = withExactFigures(() => {
      const lines = [summary.title, `Prepared ${summary.generatedFor} (${summary.currency})`, ''];
      for (const r of summary.rows) {
        const val = /%$/.test(r.label) ? String(r.value) + '%' : money(r.value);
        lines.push(`${r.label}: ${val}  [${r.source}, ${r.period}]`);
      }
      if (summary.selfReported && summary.selfReported.length) {
        lines.push('');
        lines.push('Figures entered by hand');
        for (const item of summary.selfReported) {
          const sign = item.kind === 'liability' ? '-' : '';
          const reviewed = item.lastReviewed ? `reviewed ${item.lastReviewed}` : 'review date unavailable';
          const age = item.stale ? ', may be out of date' : '';
          lines.push(`${item.label}: ${sign}${money(Math.abs(Number(item.value) || 0))}  [self-reported ${item.kind}, ${reviewed}${age}]`);
        }
      }
      if (summary.coverageNote) {
        lines.push('');
        lines.push(summary.coverageNote);
      }
      lines.push('');
      lines.push(summary.exportDisclaimer || summary.disclaimer);
      return lines.join('\n');
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast('Summary copied.'),
        () => toast('Could not copy - select and copy manually.')
      );
    } else {
      toast('Copy not available on this device.');
    }
  }

  /* ---- the destination ---- */
  /* ---- THE Position decision header: one figure, one question ----
   * Net position is what this destination answers; cash on hand, owed on card
   * and income stability are its working and sit at the supporting size behind
   * disclosure. Identical construction to Overview, Activity and Forecast -
   * only the words differ. */
  function renderPositionHeader(m, asProps = false) {
    const reactActive = typeof window !== 'undefined' && typeof document !== 'undefined';
    const nwModel = m.netWorthModel || {};
    const lead = nwModel.lead || {};
    const nw = m.netWorth || {};
    const tags = [];
    const trace = reactActive ? null : balanceUpdates.asOfTrace();
    const traceModel = reactActive ? balanceUpdates.asOfTrace(true) : null;
    if (trace) tags.push(trace);
    const noteParts = [
      nw.entered
        ? `Includes balances you entered on ${formatDisplayDate(nw.entered.asOf)}. Individual movements since your statements aren’t itemised yet.`
        : '',
      nwModel.staleWarning || '',
    ].filter(Boolean);

    const whyModel = [];
    if (lead.detail) whyModel.push({ text: lead.detail });
    if (nwModel.coverageNote) whyModel.push({ text: nwModel.coverageNote, className: 'muted small' });
    const why = reactActive ? [] : whyModel.map((item) => el('p', item.className ? { class: item.className } : {}, item.text));

    const cardLink = {
      cash: { kind: 'view', view: 'position', anchorId: '#position-cashdebt-card', goesTo: 'Where your cash sits' },
      card: {
        kind: 'view',
        view: 'activity',
        activityTab: 'analysis',
        anchorId: '#activity-card-health',
        openCardName: 'activity-card-health',
        goesTo: 'How your card is doing',
      },
      income: {
        kind: 'view',
        view: 'activity',
        activityTab: 'analysis',
        anchorId: '#activity-income',
        goesTo: 'Your regular deposits',
      },
    };
    const cashAccountList = cashAccounts(m.cashDebt);
    const cashCardAvailable =
      cashAccountList.length > 1 || cashAccountList.some((account) => account.enteredAsOf);
    const incomeCardAvailable =
      typeof ctx.activityIncomePatternAvailable !== 'function' || ctx.activityIncomePatternAvailable();
    const balanceModel = m.balances || provenModels.balances();
    const cardBalance = (balanceModel && balanceModel.accounts || []).find((item) => item.ledger === 'card') || null;
    const cardStale =
      cardBalance &&
      cardBalance.source === 'statement' &&
      cardBalance.asOf &&
      daysBetweenIso(cardBalance.asOf, isoToday()) > NUDGE_AFTER_DAYS;
    const support = ((m.cashDebtModel && m.cashDebtModel.cards) || []).map((c) => {
      const link = cardLink[c.id];
      const destinationAvailable =
        c.id === 'cash' ? cashCardAvailable : c.id === 'income' ? incomeCardAvailable : true;
      const action = c.id === 'card' && cardBalance && (cardBalance.source === 'entered' || cardStale)
        ? { label: cardBalance.source === 'entered' ? 'Fix balance' : 'Update balance', onClick: () => balanceUpdates.openUpdater(cardBalance.key) }
        : null;
      return {
        id: `position-support-${c.id}`,
        text: c.amountText,
        label: c.label,
        tag: c.tag,
        tone: c.tone,
        detail: c.detail,
        ...(action ? reactActive
          ? { actionModel: action }
          : { action: el('button', { type: 'button', class: 'btn sm ghost', onclick: action.onClick }, action.label) }
          : {}),
        ...(link && destinationAvailable && openEvidence
          ? { onClick: () => openEvidence(link), goesTo: link.goesTo }
          : {}),
      };
    });

    const money = ctx.bankMoney || ctx.money0 || ((n) => String(n));
    const owed = Math.max(0, Number(nw.totalLiabilities) || 0);
    const owned = Math.max(0, Number(nw.totalAssets) || 0);
    const recordedNet = Number(nw.recordedNetWorth);
    const net = Number.isFinite(recordedNet) ? recordedNet : owned - owed;
    const equationRows = owned > 0 || owed > 0 ? [
      { operator: '', label: 'Recorded assets', amount: money(owned) },
      { operator: '\u2212', label: 'Recorded debts', amount: money(owed) },
      { operator: '=', label: 'Recorded net worth', amount: money(net), total: true },
    ] : null;
    const equationRow = (row) => el(
      'div',
      { class: 'position-equation-row' + (row.total ? ' is-total' : '') },
      el('span', { class: 'position-equation-operator', 'aria-hidden': 'true' }, row.operator),
      el('span', { class: 'position-equation-label' }, row.label),
      el('span', { class: 'position-equation-amount num' }, row.amount)
    );
    const equation = equationRows && typeof window === 'undefined'
      ? el(
            'div',
            {
              class: 'position-equation',
              role: 'group',
              'aria-label': 'Recorded assets minus recorded debts equals recorded net worth',
            },
            el('p', { class: 'position-equation-title' }, 'How it reconciles'),
            ...equationRows.map(equationRow)
          ) : null;

    const note = noteParts.length
      ? { text: noteParts.join(' '), tone: nwModel.staleWarning ? 'watch' : 'neutral', action: nwModel.staleWarning && openEvidence ? { label: 'Review entered figures', onClick: () => openEvidence({ kind: 'view', view: 'position', anchorId: '#position-networth-card' }) } : null }
      : null;
    if (reactActive) {
      const props = {
        id: 'position-header',
        className: 'view-position',
        question: 'Where do I stand overall?',
        figure: lead.amountText != null ? lead.amountText : '',
        meaning: lead.label || 'Recorded net worth',
        tags,
        traceModel,
        note,
        why: whyModel,
        support,
        supportLabel: 'Cash, card and money in behind it',
        extraEquation: equationRows,
        extraAside: true,
      };
      return asProps ? props : decisionSurfaceReact(el, props);
    }

    return renderDecisionHeader({
      id: 'position-header',
      class: 'view-position',
      question: 'Where do I stand overall?',
      figure: { text: lead.amountText != null ? lead.amountText : '' },
      meaning: lead.label || 'Recorded net worth',
      tags,
      note,
      why,
      support,
      supportLabel: 'Cash, card and money in behind it',
      extra: equation,
      extraModel: typeof window !== 'undefined' ? equationRows : null,
      extraAside: true,
    });
  }

  function renderPosition(settings = null) {
    trackUsage('view-position');
    const reactActive = typeof window !== 'undefined' && !!settings;
    const hasBank = (state.bankRecords || []).length > 0;
    const hasCard = (state._cardStatements || []).length > 0;
    const hasInvestments = (state._investmentStatements || []).length > 0;
    if (reactActive) {
      if (!hasBank && !hasCard && !hasInvestments) return positionViewReact(el, {
        empty: { iconMarkup: iconStore(), title: 'No position yet', body: 'Add bank, card or investment statements.', actionLabel: 'Add', onAction: pickStatements },
        settings,
      });
      const m = provenModels.positionModels();
      return positionViewReact(el, {
        hero: renderPositionHeader(m, true),
        update: balanceUpdates.renderUpdateCard(true),
        netWorth: renderNetWorth(m.netWorthModel, m.netWorth, true),
        investments: renderInvestments(true).filter(Boolean),
        cash: renderCashDebt(m.cashDebtModel, m.cashDebt, true),
        summary: renderSummary(m.summary, m.balances, true),
        settings,
      });
    }
    const wrap = el('div', { class: 'accounts-wrap accounts-grid view-position' });
    if (!hasBank && !hasCard && !hasInvestments) {
      wrap.append(emptyStateReact(el, {
        iconMarkup: typeof window !== 'undefined' ? iconStore() : null,
        iconNode: typeof window === 'undefined' ? icon(iconStore()) : null,
        title: 'No position yet',
        body: 'Add bank, card or investment statements.',
        actionLabel: 'Add',
        onAction: pickStatements,
      }));
      return wrap;
    }
    const m = provenModels.positionModels();
    wrap.append(renderPositionHeader(m));
    const updater = balanceUpdates.renderUpdateCard();
    if (updater) wrap.append(updater);
    wrap.append(renderNetWorth(m.netWorthModel, m.netWorth));
    const investments = renderInvestments().filter(Boolean);
    for (let i = 0; i < investments.length; i += 2)
      pairCards(wrap, investments[i], investments[i + 1]);
    const cashCard = renderCashDebt(m.cashDebtModel, m.cashDebt);
    pairCards(wrap, cashCard, renderSummary(m.summary, m.balances));
    placeFoldAll(el, wrap);
    return wrap;
  }

  return { renderPosition };
}
