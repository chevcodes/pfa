import { growIn, staggerIn } from './motion.js';
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
 *   - the recorded net worth NEVER shows a bare "complete" total: its tag states
 *     coverage ("covers N of M classes") and its own note names the gaps;
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
  markProportional,
  figuresHidden,
} from '../core/shared-helpers.js';
import { renderShareBar } from '../analysis/reporting-core.js';
import { createDecisionHeader } from './decision-header.js';

export function createPositionRenderer(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      'icon',
      'provenModels',
      'iconInfo',
      'trackUsage',
      'Store',
      'render',
      'makeManualAsset',
      'NET_WORTH_CLASSES',
      'toast',
      'smoothScrollToEl',
      'drillToAccount',
      'pickStatements',
    ],
    'createPositionRenderer'
  );
  const {
    state,
    el,
    icon,
    provenModels,
    iconInfo,
    trackUsage,
    Store,
    render,
    makeManualAsset,
    NET_WORTH_CLASSES,
    smoothScrollToEl,
    drillToAccount,
    pickStatements,
  } = ctx;  // Optional icons: used when present, degraded gracefully when not (so this
  // renderer never crashes if the icon set lacks one of these names).
  const iconStore = ctx.iconStore || iconInfo;
  const iconList = ctx.iconList || iconInfo;
  const toast = ctx.toast || (() => {});
  const { renderDecisionHeader } = createDecisionHeader({ el });

  function renderCashDebt(cashDebtModel, cashDebt) {
    const perAccount = cashDebt && cashDebt.perAccount ? cashDebt.perAccount : {};
    const accounts = Array.isArray(cashDebt && cashDebt.accounts)
      ? cashDebt.accounts.slice()
      : Object.entries(perAccount).map(([account, balance]) => ({
          account,
          currency: cashDebt.baseCurrency,
          nativeBalance: Number(balance) || 0,
          baseBalance: Number(balance) || 0,
        }));
    if (accounts.length <= 1) return null;
    const sec = el('section', { class: 'card', id: 'position-cashdebt' });
    const accountMoney = ctx.bankMoney || ctx.money0 || ((n) => String(n));
    const base = cashDebt.baseCurrency || 'JMD';
    const currencies = new Set(accounts.map((account) => account.currency || base));
    const comparableAccounts = accounts.filter((account) => Number.isFinite(account.baseBalance));
    const positiveAccounts = comparableAccounts.filter((account) => Number(account.baseBalance) > 0);
    const representedCash = comparableAccounts.reduce(
      (sum, account) => sum + Number(account.baseBalance),
      0
    );
    const positiveCash = positiveAccounts.reduce(
      (sum, account) => sum + Number(account.baseBalance),
      0
    );
    const unconverted = accounts.filter((account) => account.baseBalance == null).length;
    const belowZero = comparableAccounts.filter((account) => Number(account.baseBalance) < 0).length;
    const accountLabel = (account) => {
      const value = String(account);
      const last4 = value.slice(-4);
      const collides = accounts.filter((item) => String(item.account).slice(-4) === last4).length > 1;
      return collides || value.length <= 4 ? value : '\u2026' + last4;
    };
    const currencyMoney = (account) => {
      if ((account.currency || base) === base) return accountMoney(account.nativeBalance);
      const prefix = account.currency === 'USD' ? 'US$' : `${account.currency} `;
      return formatMoney(Number(account.nativeBalance) || 0, prefix, undefined, 2);
    };

    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconInfo()), 'Where your cash sits'),
        el(
          'span',
          { class: 'position-cash-count muted small' },
          `${accounts.length} accounts \u00b7 ${currencies.size} ${currencies.size === 1 ? 'currency' : 'currencies'}`
        )
      )
    );

    const overview = el(
      'div',
      { class: 'position-cash-overview' },
      el(
        'div',
        { class: 'position-cash-summary' },
        el('span', { class: 'muted small' }, `Represented in ${base}`),
        el('strong', { class: 'position-cash-total num metric-value metric--minor' }, accountMoney(representedCash)),
        el(
          'span',
          { class: 'muted small' },
          unconverted
            ? `Plus ${unconverted} account${unconverted === 1 ? '' : 's'} kept in its own currency`
            : belowZero
              ? `${belowZero} account${belowZero === 1 ? ' is' : 's are'} below zero and shown separately`
            : 'Converted accounts use the dated rate shown under Assets included'
        )
      )
    );
    if (positiveAccounts.length > 1) {
      const share = renderShareBar(el, {
        palette: ['var(--accent)', 'var(--chart-in)', 'var(--good)', 'var(--warn)'],
        segments: positiveAccounts
          .slice()
          .sort((a, b) => b.baseBalance - a.baseBalance)
          .map((account) => ({
            amount: Number(account.baseBalance),
            label: `${accountLabel(account.account)} \u00b7 ${account.currency || base}`,
          })),
      });
      if (share) overview.append(el('div', { class: 'position-cash-share' }, share));
    }
    sec.append(overview);

    const grid = el('div', { class: 'position-account-grid' });
    const fills = [];
    for (const account of accounts.sort((a, b) => {
      const av = a.baseBalance == null ? -Infinity : Number(a.baseBalance);
      const bv = b.baseBalance == null ? -Infinity : Number(b.baseBalance);
      return bv - av;
    })) {
      const converted = (account.currency || base) !== base && account.baseBalance != null;
      const share = positiveCash > 0 && Number(account.baseBalance) > 0
        ? Math.max(0, Math.min(100, (Number(account.baseBalance) / positiveCash) * 100))
        : null;
      const card = el(
        'button',
        {
          class: 'position-account-card',
          'aria-label': `Open activity for account ${accountLabel(account.account)}`,
          onclick: () => {
            trackUsage('position-drill-account');
            drillToAccount(account.account);
          },
        },
        el(
          'span',
          { class: 'position-account-head' },
          el('span', { class: 'position-account-name' }, accountLabel(account.account)),
          el('span', { class: 'position-currency-pill' }, account.currency || base)
        ),
        el('strong', { class: 'position-account-amount num' }, currencyMoney(account)),
        el(
          'span',
          { class: 'position-account-converted muted small num' },
          converted ? `\u2248 ${accountMoney(account.baseBalance)} ${base}` : (account.currency || base) === base ? base : 'Kept separate'
        )
      );
      if (share != null) {
        const fill = el('span', {
          class: 'position-account-fill',
          style: `width:${Math.max(2, Math.round(share))}%`,
        });
        fills.push(fill);
        card.append(
          el(
            'span',
            { class: 'position-account-share' },
            el(
              'span',
              { class: 'position-account-share-label muted small num' },
              figuresHidden() ? '\u2022\u2022% of represented cash' : `${Math.round(share)}% of represented cash`
            ),
            markProportional(el('span', { class: 'position-account-track' }, fill)),
          )
        );
      }
      grid.append(card);
    }
    sec.append(grid);
    staggerIn(fills, () => [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      step: 45,
      duration: 460,
    });

    return sec;
  }

  function renderNetWorth(nwModel, nw) {
    const sec = el('section', { class: 'card', id: 'position-networth' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconStore()), 'Recorded assets and debts')
      )
    );

    const totA = Number(nw && nw.totalAssets) || 0;
    const totL = Number(nw && nw.totalLiabilities) || 0;
    const net = Number(nw && nw.recordedNetWorth);
    const netWorth = Number.isFinite(net) ? net : totA - totL;
    const money = ctx.bankMoney || ctx.money0 || ((n) => String(n));
    if (totA > 0 || totL > 0) {
      const scale = Math.max(totA, totL, Math.abs(netWorth)) || 1;
      const bar = (label, amount, tone, operator = '') => {
        const width = Math.max(2, Math.round((Math.abs(amount) / scale) * 100));
        const fill = el('span', {
          class: `position-balance-fill is-${tone}`,
          style: `width:${width}%;transform-origin:left center`,
        });
        growIn(fill, { transform: 'scaleX(0)' }, { transform: 'scaleX(1)' });
        return el(
          'div',
          { class: 'position-balance-row' },
          el('span', { class: 'position-balance-operator', 'aria-hidden': 'true' }, operator),
          el('span', { class: 'position-balance-label' }, label),
          markProportional(el('span', { class: 'position-balance-track' }, fill)),
          el('span', { class: 'position-balance-amount num metric-value metric--row' }, money(amount))
        );
      };
      const insight = figuresHidden()
        ? 'Recorded net worth is the amount left after recorded debts.'
        : netWorth >= 0 && totA > 0
          ? `${Math.round((netWorth / totA) * 100)}% of recorded assets remain after recorded debts.`
          : `Recorded debts exceed assets by ${money(Math.abs(netWorth))}.`;
      sec.append(
        el(
          'div',
          { class: 'position-balance', role: 'group', 'aria-label': 'Recorded balance comparison' },
          el('p', { class: 'position-balance-title' }, 'Recorded balance'),
          bar('Assets', totA, 'asset'),
          bar('Debts', totL, 'debt', '\u2212'),
          bar('Net worth', netWorth, netWorth >= 0 ? 'net' : 'negative', '='),
          el('p', { class: 'position-balance-insight' }, insight)
        )
      );
    }

    const cov = nw && nw.coverage;
    if (cov && cov.of > 0) {
      const track = el('div', {
        class: 'nw-coverage',
        'aria-label': `Covers ${cov.covered} of ${cov.of} asset and debt classes`,
      });
      for (let i = 0; i < cov.of; i++) {
        track.append(
          el('span', {
            class: 'nw-cov-seg' + (i < cov.covered ? ' filled' : ''),
          })
        );
      }
      sec.append(
        el(
          'div',
          { class: 'nw-cov-row' },
          track,
          el('span', { class: 'muted small' }, `${cov.covered} of ${cov.of} classes recorded`)
        )
      );
    }

    const lines = nw && nw.lines ? nw.lines : [];
    const notIncluded = nwModel.notIncluded || { assets: [], liabilities: [] };

    function openAddFor(kind, cls) {
      trackUsage('position-add-gap');
      const select = document.getElementById('position-add-class-select');
      if (select) {
        select.value = kind + ':' + cls;
        select.dispatchEvent(new Event('change'));
      }
      const disclosure = document.getElementById('position-add-disclosure');
      if (disclosure) disclosure.open = true;
      smoothScrollToEl('#position-add-disclosure');
      requestAnimationFrame(() => disclosure?.querySelector('input[type="number"]')?.focus());
    }
    const gapClasses = [
      ...notIncluded.assets.map((c) => ({ cls: c, kind: 'asset' })),
      ...notIncluded.liabilities.map((c) => ({ cls: c, kind: 'liability' })),
    ];
    let gapBox = null;
    if (gapClasses.length) {
      gapBox = el('details', { class: 'secondary' });
      gapBox.append(
        el('summary', {}, icon(iconInfo()), ' Not included or not confirmed')
      );
      const gapBody = el('div', { class: 'sec-section' });
      const gapList = el('div', { class: 'recurring-list' });
      for (const g of gapClasses) {
        gapList.append(
          el(
            'button',
            { class: 'recurring-row', onclick: () => openAddFor(g.kind, g.cls) },
            el('span', { class: 'recurring-name' }, g.cls),
            el('span', { class: 'recurring-amt muted small' }, 'Add')
          )
        );
      }
      gapBody.append(gapList);
      gapBox.append(gapBody);
    }


    function renderFilledLine(l) {
      const cls = l.class;
      const isConverted = l.rate != null && l.nativeAmount != null;
      const label =
        (l.label && l.label !== cls ? l.label : cls) + (l.currency ? ` (${l.currency})` : '');
      const meta = [];
      if (l.source === 'reconciled') {
        if (l.rateStale) meta.push('rate may be out of date');
      } else {
        if (l.stale) meta.push('may be out of date');
        else if (l.lastReviewed) meta.push(formatDisplayDate(l.lastReviewed));
      }
      const amtText = (isConverted ? '\u2248 ' : '') + formatLineAmount(l);
      const kids = [
        el('span', { class: 'recurring-name' }, label),
        meta.length
          ? el('span', { class: 'recurring-months muted small' }, meta.join(' \u00b7 '))
          : el('span', {}),
        el('span', { class: 'recurring-amt num strong' }, amtText),
      ];
      if (l.source === 'self-reported' && l.id) {
        kids.push(
          el(
            'button',
            {
              class: 'btn sm ghost position-remove',
              title: 'Remove',
              'aria-label': `Remove ${label}`,
              onclick: () => removeAsset(l.id),
            },
            'Remove'
          )
        );
      }
      const frag = el('div', {});
      frag.append(el('div', { class: 'recurring-row' + (l.stale ? ' lapsed' : '') }, ...kids));
      if (isConverted) {
        const nativeText = formatMoney(
          Number(l.nativeAmount),
          l.currency === 'USD' ? 'US$' : l.currency + ' ',
          undefined,
          2
        );
        const d = el('details', {
          class: 'vm-detail',
          style: 'margin:2px 0 8px',
        });
        d.append(
          el('summary', { class: 'muted small' }, 'Rate'),
          el(
            'div',
            { class: 'vm-detail-body muted small' },
            `${nativeText} \u00d7 ${l.rate}${l.rateAsOf ? ` \u00b7 ${l.rateAsOf}` : ''}`
          )
        );
        frag.append(d);
      }
      return frag;
    }

    const assetLines = lines.filter((l) => l.kind === 'asset');
    const debtLines = lines.filter((l) => l.kind === 'liability');

    const lineAmount = (l) => Math.abs(Number(l.amount) || 0);
    const addWeighted = (title, group, tone) => {
      if (!group.length) return null;
      const panel = el('section', { class: `position-mix-panel is-${tone}` });
      const total = group.reduce((sum, l) => sum + lineAmount(l), 0) || 1;
      panel.append(
        el(
          'div',
          { class: 'position-mix-head' },
          el('h4', { class: 'position-mix-title' }, title),
          el('span', { class: 'position-mix-total num' }, money(total))
        )
      );
      const list = el('div', { class: 'recurring-list' });
      const fills = [];
      for (const l of group) {
        const holder = el('div', { class: 'pos-line' });
        holder.append(renderFilledLine(l));
        const share = Math.max(0, Math.min(100, (lineAmount(l) / total) * 100));
        const width = Math.max(2, Math.round(share));
        const fill = el('span', {
          class: `pos-bar-fill is-${tone}`,
          style: `width:${width}%`,
        });
        fills.push(fill);
        holder.append(
          el(
            'div',
            { class: 'position-mix-share' },
            markProportional(el('span', { class: 'pos-bar' }, fill)),
            el('span', { class: 'muted small num' }, figuresHidden() ? '\u2022\u2022%' : `${Math.round(share)}%`)
          )
        );
        list.append(holder);
      }
      panel.append(list);
      staggerIn(fills, () => [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        step: 40,
        duration: 460,
      });
      return panel;
    };

    const assetPanel = addWeighted('Assets included', assetLines, 'own');
    const debtPanel = addWeighted('Debts included', debtLines, 'owe');
    if (assetPanel || debtPanel) {
      sec.append(el('div', { class: 'position-mix' }, ...(assetPanel ? [assetPanel] : []), ...(debtPanel ? [debtPanel] : [])));
    }

    if (gapBox) sec.append(gapBox);
    sec.append(renderAddDisclosure(notIncluded));
    return sec;
  }

  function renderAddDisclosure() {
    const box = el('details', { class: 'secondary', id: 'position-add-disclosure' });
    box.append(el('summary', {}, icon(iconInfo()), ' Add an asset or debt'));
    const body = el('div', { class: 'sec-section' });
    // Only classes not already fully represented are offered; a class can still
    // be re-added (a second property) since manual classes hold many entries.
    const assetClasses = NET_WORTH_CLASSES.assets.filter((c) => c !== 'Cash & bank');
    const liabilityClasses = NET_WORTH_CLASSES.liabilities.filter((c) => c !== 'Credit card');

    const classSel = el('select', {
      class: 'mini',
      id: 'position-add-class-select',
      'aria-label': 'What is it',
    });

    const ownGroup = el('optgroup', { label: 'Assets' });
    for (const c of assetClasses) ownGroup.append(el('option', { value: 'asset:' + c }, c));
    const oweGroup = el('optgroup', { label: 'Debts' });
    for (const c of liabilityClasses) oweGroup.append(el('option', { value: 'liability:' + c }, c));
    classSel.append(ownGroup, oweGroup);

    const nameInput = el('input', {
      type: 'text',
      class: 'name-field',
      maxlength: '40',
      placeholder: 'Name (optional)',
      'aria-label': 'Name (optional)',
    });
    const amountInput = el('input', {
      type: 'number',
      class: 'name-field',
      min: '0',
      step: '1',
      inputmode: 'decimal',
      placeholder: 'Amount',
      'aria-label': 'Amount',
    });

    // "Other assets"/"Other debts" genuinely need a name; the standard classes
    // read fine named after themselves, so the name field only signals required
    // for the two catch-alls.
    const syncName = () => {
      const cls = classSel.value.split(':')[1] || '';
      const needsName = cls === 'Other assets' || cls === 'Other debts';
      nameInput.placeholder = needsName ? 'Name (e.g. what it is)' : 'Name (optional)';
    };
    classSel.addEventListener('change', syncName);
    syncName();

    const save = async () => {
      const [kind, cls] = classSel.value.split(':');
      const amount = Number(amountInput.value);
      if (!(amount > 0)) {
        toast('Enter an amount first.');
        return;
      }
      const rec = makeManualAsset({
        class: cls,
        label: (nameInput.value || '').trim() || cls,
        amount,
        kind,
      });
      await Store.manualAssets.put(rec);
      state.manualAssets = await Store.manualAssets.all();
      trackUsage('position-add-asset');
      render();
      toast(`Added ${rec.label}.`);
    };
    amountInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });

    body.append(
      el(
        'div',
        { class: 'position-add-fields' },
        el('label', { class: 'field-label' }, el('span', {}, 'Type'), classSel),
        el('label', { class: 'field-label' }, el('span', {}, 'Name'), nameInput),
        el('label', { class: 'field-label' }, el('span', {}, 'Amount'), amountInput),
        el('button', { class: 'btn sm', onclick: save }, 'Add to position')
      )
    );
    box.append(body);
    return box;
  }

  async function removeAsset(id) {
    if (!id) return;
    const prior = state.manualAssets.find((item) => item.id === id);
    await Store.manualAssets.delete(id);
    state.manualAssets = await Store.manualAssets.all();
    trackUsage('position-remove-asset');
    render();
    toast(prior ? `Removed ${prior.label}.` : 'Removed.', prior ? async () => {
      await Store.manualAssets.put(prior);
      state.manualAssets = await Store.manualAssets.all();
      render();
      toast(`Restored ${prior.label}.`);
    } : null);
  }

  function formatLineAmount(l) {
    const money = ctx.bankMoney || ctx.money0 || ((n) => String(n));
    const v = Number(l.amount) || 0;
    return money(Math.abs(v));
  }

  function renderSummary(summary) {
    const sec = el('section', { class: 'card position-summary' });
    const money = ctx.bankMoney || ctx.money0 || ((n) => String(n));
    const copyButton = el(
      'button',
      {
        class: 'btn sm',
        onclick: () => {
          copySummary(summary, money);
          trackUsage('position-copy-summary');
        },
      },
      'Copy summary'
    );
    sec.append(
      el(
        'div',
        { class: 'card-head position-summary-head' },
        el('h3', { class: 'card-title' }, icon(iconList()), 'Shareable financial summary'),
        copyButton
      )
    );

    const rows = summary.rows || [];
    const rowByLabel = (label) => rows.find((row) => row.label === label) || null;
    const netWorth = rowByLabel('Recorded net worth');
    const cardBalance = rowByLabel('Card balance');
    const utilisation = rowByLabel('Card utilisation %');
    const income = rowByLabel('Typical monthly income');
    const outflow = rowByLabel('Typical monthly outflow');
    const cashRows = rows.filter((row) => row.label === 'Cash on hand' || /^Cash \(/.test(row.label));
    const figure = (row) => money(Number(row && row.value) || 0);
    const simpleRow = (row) =>
      el(
        'div',
        { class: 'position-summary-row' },
        el('span', { class: 'muted' }, row.label.replace(' - converted', '')),
        el('strong', { class: 'num' }, figure(row))
      );

    if (netWorth) {
      sec.append(
        el(
          'div',
          { class: `position-summary-hero${Number(netWorth.value) < 0 ? ' is-negative' : ''}` },
          el(
            'span',
            { class: 'position-summary-hero-labels' },
            el('span', { class: 'position-summary-hero-label' }, 'Recorded net worth'),
            el('span', { class: 'muted small' }, 'The headline figure included when this summary is copied')
          ),
          el('strong', { class: 'position-summary-hero-value num metric-value metric--major' }, figure(netWorth))
        )
      );
    }

    const panels = el('div', { class: 'position-summary-grid' });
    if (cashRows.length) {
      panels.append(
        el(
          'section',
          { class: 'position-summary-panel' },
          el('h4', { class: 'position-summary-title' }, 'Cash represented'),
          ...cashRows.map(simpleRow)
        )
      );
    }
    if (cardBalance || utilisation) {
      const cardPanel = el(
        'section',
        { class: 'position-summary-panel' },
        el('h4', { class: 'position-summary-title' }, 'Card position')
      );
      if (cardBalance) cardPanel.append(simpleRow(cardBalance));
      if (utilisation) {
        const used = Math.max(0, Math.min(100, Number(utilisation.value) || 0));
        const fill = el('span', { class: 'position-utilisation-fill', style: `width:${used}%` });
        cardPanel.append(
          el(
            'div',
            { class: 'position-utilisation' },
            el(
              'div',
              { class: 'position-utilisation-head' },
              el('span', { class: 'muted' }, 'Limit used'),
              el('strong', { class: 'num' }, figuresHidden() ? '\u2022\u2022%' : `${used}%`)
            ),
            markProportional(el('span', { class: 'position-utilisation-track' }, fill))
          )
        );
      }
      panels.append(cardPanel);
    }
    if (income || outflow) {
      const monthlyPanel = el(
        'section',
        { class: 'position-summary-panel' },
        el('h4', { class: 'position-summary-title' }, 'Typical month')
      );
      const scale = Math.max(Number(income && income.value) || 0, Number(outflow && outflow.value) || 0, 1);
      const monthlyRow = (row, tone) => {
        if (!row) return null;
        const width = Math.max(2, Math.round(((Number(row.value) || 0) / scale) * 100));
        return el(
          'div',
          { class: 'position-monthly-row' },
          simpleRow(row),
          markProportional(
            el(
              'span',
              { class: 'position-monthly-track' },
              el('span', { class: `position-monthly-fill is-${tone}`, style: `width:${width}%` })
            )
          )
        );
      };
      const incomeRow = monthlyRow(income, 'income');
      const outflowRow = monthlyRow(outflow, 'outflow');
      if (incomeRow) monthlyPanel.append(incomeRow);
      if (outflowRow) monthlyPanel.append(outflowRow);
      panels.append(monthlyPanel);
    }
    sec.append(panels);

    sec.append(
      el(
        'p',
        { class: 'position-summary-note muted small' },
        summary.disclaimer,
        ' The copied version also includes dates, sources, and coverage.'
      )
    );
    return sec;
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
  function renderPositionHeader(m) {
    const nwModel = m.netWorthModel || {};
    const lead = nwModel.lead || {};
    const nw = m.netWorth || {};
    const tags = [];
    if (lead.tag) tags.push({ text: lead.tag, tone: lead.tone || 'neutral' });

    const why = [];
    if (lead.detail) why.push(el('p', {}, lead.detail));
    if (nwModel.coverageNote) why.push(el('p', { class: 'muted small' }, nwModel.coverageNote));

    const support = ((m.cashDebtModel && m.cashDebtModel.cards) || []).map((c) => ({
      text: c.amountText,
      label: c.label,
      tag: c.tag,
      tone: c.tone,
      detail: c.detail,
    }));

    const money = ctx.bankMoney || ctx.money0 || ((n) => String(n));
    const owed = Math.max(0, Number(nw.totalLiabilities) || 0);
    const owned = Math.max(0, Number(nw.totalAssets) || 0);
    const recordedNet = Number(nw.recordedNetWorth);
    const net = Number.isFinite(recordedNet) ? recordedNet : owned - owed;
    const equationRow = (operator, label, amount, total = false) =>
      el(
        'div',
        { class: 'position-equation-row' + (total ? ' is-total' : '') },
        el('span', { class: 'position-equation-operator', 'aria-hidden': 'true' }, operator),
        el('span', { class: 'position-equation-label' }, label),
        el('span', { class: 'position-equation-amount num' }, money(amount))
      );
    const equation =
      owned > 0 || owed > 0
        ? el(
            'div',
            {
              class: 'position-equation',
              role: 'group',
              'aria-label': 'Recorded assets minus recorded debts equals recorded net worth',
            },
            el('p', { class: 'position-equation-title' }, 'How it reconciles'),
            equationRow('', 'Recorded assets', owned),
            equationRow('\u2212', 'Recorded debts', owed),
            equationRow('=', 'Recorded net worth', net, true)
          )
        : null;

    return renderDecisionHeader({
      id: 'position-header',
      class: 'view-position',
      question: 'Where do I stand overall?',
      figure: { text: lead.amountText != null ? lead.amountText : '' },
      meaning: lead.label || 'Recorded net worth',
      tags,
      note: nwModel.staleWarning ? { text: nwModel.staleWarning, tone: 'watch' } : null,
      why,
      support,
      supportLabel: 'Cash, card and income behind it',
      extra: equation,
      extraAside: true,
    });
  }

  function renderPosition() {
    trackUsage('view-position');
    const wrap = el('div', { class: 'accounts-wrap accounts-grid view-position' });
    // No bank data -> nothing reconciled to stand on. A card-only device still
    // has a card balance, so guard on there being ANY position to show.
    const hasBank = (state.bankRecords || []).length > 0;
    const hasCard = (state._cardStatements || []).length > 0;
    if (!hasBank && !hasCard) {
      const empty = el(
        'section',
        { class: 'card empty' },
        el('div', { class: 'empty-icon', html: iconStore() }),
        el('h2', {}, 'No position yet'),
        el(
          'p',
          { class: 'muted' },
          'Add bank or card statements.'
        ),
        el('button', { class: 'btn primary', onclick: pickStatements }, 'Add statement')
      );
      wrap.append(empty);
      return wrap;
    }
    const m = provenModels.positionModels();
    wrap.append(renderPositionHeader(m));
    wrap.append(renderNetWorth(m.netWorthModel, m.netWorth));
    const cashCard = renderCashDebt(m.cashDebtModel, m.cashDebt);
    if (cashCard) wrap.append(cashCard);
    wrap.append(renderSummary(m.summary));
    return wrap;
  }

  return { renderPosition };
}
