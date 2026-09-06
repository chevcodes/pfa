import { fnv1a, money, roundMoney, MONTHS } from '../core/shared-helpers.js';

const AMT = String.raw`\(?-?[\d,]+\.\d{2}\)?`;
const DEC = String.raw`-?[\d,]+\.\d{2,4}`;
const PCT = String.raw`(-?[\d,]*\.?\d+)\s*%`;

const CASH_ROW = new RegExp(
  String.raw`^CASH\s+(\S+)\s+(.+?)\s+([A-Z]{3})\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(${AMT})\s+(${DEC})\s+(${AMT})\s+(${AMT})\s+(${AMT})$`
);
const EQUITY_ROW = new RegExp(
  String.raw`^(.+?)\s+(${DEC})\s+([A-Z]{3})\s+(${AMT})\s+(${DEC})\s+(${AMT})\s+(${AMT})\s+(${AMT})\s+${PCT}$`
);
const FUND_ROW = new RegExp(
  String.raw`^(.+?)\s+([A-Z]{3})\s+(${DEC})\s+(${DEC})\s+(${DEC})\s+(${AMT})\s+(${AMT})\s+${PCT}$`
);
const ACTIVITY_CASH_ROW = new RegExp(
  String.raw`^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(\d+)\s+([A-Z])\s+(${AMT})\s+(${AMT})(?:\s|$)`
);
const CLASS_ROW = new RegExp(String.raw`^([A-Za-z][A-Za-z &/-]*?)\s+\$?(${AMT})\s+(-?[\d.]+)\s*%$`);
const PAGE_MARK = /\bPage\s*(\d+)\s*of\s*(\d+)\b/gi;
const FX_ROW = /\b([A-Z]{3})\s+(\d+(?:\.\d+)?)\s*:\s*1(?:\.0+)?\b/;
const WRAP_LINE = /^[A-Z][A-Z0-9 &.,'()/-]*$/;
const HOLDING_LIKE = /\d[\d,]*\.\d{2}.*%$/;
const KEY_DROP = /\b(?:ORDINARY|SHARES)\b/g;
const SECURITY_DROP = /\b(?:LIMITED|LTD|ORDINARY|SHARES)\b/g;
const NCB_HOLDING_ROW = new RegExp(
  String.raw`^(${DEC})\s+(.+?)\s+(${AMT})\s+(${DEC})(?:\s+(${DEC})%?)?\s+(${AMT})\s+(${AMT})$`
);
const NCB_CASH_ROW = new RegExp(
  String.raw`^(${DEC})\s+(.+?)\s+(${AMT})\s+(${AMT})\s+(${AMT})$`
);
const NCB_PORTFOLIO_TOTAL = new RegExp(String.raw`^Portfolio Total\s+(${AMT})$`, 'i');
const NCB_CLASS_TOTAL = new RegExp(String.raw`^Total Value(?: Exchange Rate)?\s+(${AMT})$`, 'i');
const NCB_GRAND_TOTAL = new RegExp(String.raw`^Total\s+(${AMT})$`, 'i');

const SCOTIA_MARKERS = [
  /scotia investments jamaica limited/,
  /investment accounts consolidated statement/,
  /details of your account holdings/,
  /asset class summary/,
  /total value of account/,
];

export const HOLDING_SECTIONS = {
  scotia: [
    { match: /^Cash$/i, kind: 'cash', label: 'Cash' },
    { match: /^Equities$/i, kind: 'equity', label: 'Equities' },
    { match: /^Unit Trust$/i, kind: 'fund', label: 'Funds' },
  ],
  ncb: [
    { match: /^CASH\s*&\s*CASH EQUIVALENTS(?:\s+[A-Z]{3})?$/i, kind: 'cash', label: 'Cash' },
    { match: /^STOCKS(?:\s+[A-Z]{3})?$/i, kind: 'equity', label: 'Equities' },
    { match: /^MUTUAL FUNDS\s*&\s*COLLECTIVE INV(?:\s+[A-Z]{3})?$/i, kind: 'fund', label: 'Funds' },
  ],
};

export function detectInvestmentProvider(lines) {
  const text = (Array.isArray(lines) ? lines.join('\n') : String(lines == null ? '' : lines))
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!text.trim()) return null;
  if (
    /asset portfolio/.test(text) &&
    (/ncb capital markets/.test(text) || /member of the jamaica stock exchange/.test(text))
  )
    return 'ncb';
  return SCOTIA_MARKERS.filter((re) => re.test(text)).length >= 2 ? 'scotia' : null;
}

export function isInvestmentStatement(lines) {
  return detectInvestmentProvider(lines) != null;
}

function normalisedName(description, drop = KEY_DROP) {
  return String(description == null ? '' : description)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(drop, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function holdingKey(kind, subAccount, description, provider = 'scotia') {
  const name = normalisedName(description);
  if (
    provider === 'ncb' &&
    (name === 'CASH BALANCE' || name === 'NCB CAP M FUND RETAIL REPO MIGRATION')
  )
    return 'ncb|retail-repo-migration';
  return `${kind}|${String(subAccount == null ? '' : subAccount).toUpperCase()}|${name}`;
}

export function securityKey(kind, description) {
  const name = normalisedName(description, SECURITY_DROP);
  return `${kind}|${name}`;
}

export function canonicalHoldingSection(provider, label) {
  const rows = HOLDING_SECTIONS[provider] || [];
  return rows.find((row) => row.match.test(String(label || '').trim())) || null;
}

function statementProvenance(provider) {
  const ncb = provider === 'ncb';
  return {
    account: 'statement',
    periodStart: ncb ? 'absent' : 'statement',
    periodEnd: 'statement',
    printedTotal: 'statement',
    fxRates: ncb ? 'absent' : 'statement',
    cashActivity: ncb ? 'absent' : 'statement',
  };
}

function holdingProvenance(provider, facts) {
  const stated = (key) => (facts[key] == null ? 'absent' : 'statement');
  return {
    quantity: stated('quantity'),
    purchaseCost: stated('avgCostRaw'),
    price: stated('price'),
    yield: stated('yield'),
    unrealisedGainLoss: stated('unrealisedGainLoss'),
    currentValue: stated('value'),
    valueBase: facts.valueBase == null ? 'absent' : 'derived',
    lastMonthValue: stated('lastMonthValue'),
    statedChangePct: stated('statedChangePct'),
    provider,
  };
}

function holding(provider, kind, subAccount, description, currency, facts) {
  const name = String(description == null ? '' : description)
    .trim();
  const complete = {
    quantity: null,
    avgCostRaw: null,
    costBasisType: null,
    price: null,
    yield: null,
    value: null,
    valueBase: null,
    lastMonthValue: null,
    statedChangePct: null,
    unrealisedGainLoss: null,
    ...facts,
  };
  return {
    key: holdingKey(kind, subAccount, name, provider),
    provider,
    kind,
    section: complete.section || '',
    subAccount: subAccount || '',
    description: name,
    currency,
    ...complete,
    provenance: holdingProvenance(provider, complete),
  };
}

function num(value) {
  const text = String(value == null ? '' : value).trim();
  const negative = /^\(.*\)$/.test(text);
  const parsed = money(text.replace(/[()]/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

function isoDate(value) {
  const m = /^(\d{1,2})[-\s]+([A-Za-z]{3})[-\s]+(\d{2}|\d{4})$/.exec(
    String(value == null ? '' : value).trim()
  );
  const named = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(
    String(value == null ? '' : value).trim()
  );
  const parts = m ? [m[1], m[2], m[3]] : named ? [named[2], named[1].slice(0, 3), named[3]] : null;
  if (!parts) return null;
  const mi = MONTHS.indexOf(parts[1].toLowerCase());
  if (mi < 0) return null;
  const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
  return `${year}-${String(mi + 1).padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

export function splitInvestmentStatements(lines) {
  const list = Array.isArray(lines) ? lines : [];
  const segments = [];
  const lead = [];
  for (const line of list) {
    if (/Investment Accounts Consolidated Statement/i.test(String(line))) segments.push([]);
    if (segments.length) segments[segments.length - 1].push(line);
    else lead.push(line);
  }
  if (!segments.length) return lead.length ? [lead] : [];
  segments[0] = [...lead, ...segments[0]];
  return segments;
}

function parseScotiaInvestmentStatement(segLines, sourceFile = '') {
  const lines = (Array.isArray(segLines) ? segLines : [])
    .map((line) => String(line == null ? '' : line).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const st = {
    hash: null,
    provider: 'scotia',
    account: null,
    periodStart: null,
    periodEnd: null,
    printedTotal: null,
    fxRates: {},
    classTotals: [],
    pagesDeclared: null,
    pagesSeen: [],
    activityPresent: false,
    cashActivitySection: false,
    cashActivity: [],
    holdings: [],
    warnings: [],
    provenance: statementProvenance('scotia'),
    source_file: sourceFile,
  };
  const pages = new Set();
  let area = '';
  let section = '';
  let subAccount = '';
  let cashAccount = '';
  let cashCurrency = '';
  let inClasses = false;
  let wrapTarget = null;
  let unread = 0;
  for (const t of lines) {
    let m;
    for (const pm of t.matchAll(PAGE_MARK)) {
      pages.add(Number(pm[1]));
      st.pagesDeclared = Math.max(st.pagesDeclared || 0, Number(pm[2]));
    }
    if (!st.account && (m = /Account Number\s*:\s*([A-Za-z0-9-]+)/i.exec(t))) st.account = m[1];
    if (!st.periodStart && (m = /Period Start Date:\s*(\d{1,2}-[A-Za-z]{3}-\d{2,4})/i.exec(t)))
      st.periodStart = isoDate(m[1]);
    if (!st.periodEnd && (m = /Period End Date:\s*(\d{1,2}-[A-Za-z]{3}-\d{2,4})/i.exec(t)))
      st.periodEnd = isoDate(m[1]);
    if (
      st.printedTotal == null &&
      (m = /Total Value of Account\s*\$?\s*(\(?-?[\d,]+\.\d{2}\)?)/i.exec(t))
    ) {
      st.printedTotal = num(m[1]);
      inClasses = false;
      continue;
    }
    if ((m = FX_ROW.exec(t))) {
      st.fxRates[m[1]] = Number(m[2]);
      continue;
    }
    if (/^Asset Class Summary\b/i.test(t)) {
      inClasses = true;
      continue;
    }
    if (inClasses && (m = CLASS_ROW.exec(t))) {
      st.classTotals.push({ label: m[1], value: num(m[2]) });
      continue;
    }
    if (/^Details of Your Account Holdings\b/i.test(t)) {
      area = 'holdings';
      section = '';
      wrapTarget = null;
      continue;
    }
    if (/^Monthly Activity\b/i.test(t)) {
      area = 'activity';
      section = '';
      wrapTarget = null;
      st.activityPresent = true;
      continue;
    }
    if (area === 'holdings') {
      if (wrapTarget && WRAP_LINE.test(t) && !/^(TOTAL|JMD|USD|CASH)\b/.test(t)) {
        wrapTarget.description = `${wrapTarget.description} ${t}`;
        wrapTarget.key = holdingKey(wrapTarget.kind, wrapTarget.subAccount, wrapTarget.description);
        wrapTarget = null;
        continue;
      }
      wrapTarget = null;
      if (t === 'Cash') {
        section = 'cash';
        continue;
      }
      if (t === 'Equities') {
        section = 'equity';
        continue;
      }
      if (t === 'Unit Trust') {
        section = 'fund';
        subAccount = '';
        continue;
      }
      if (section === 'fund' && (m = /^Account\s*#\s*(\S+)$/i.exec(t))) {
        subAccount = m[1];
        continue;
      }
      if (section === 'cash' && (m = CASH_ROW.exec(t))) {
        st.holdings.push(
          holding('scotia', 'cash', m[1], m[2], m[3], {
            section: 'Cash',
            value: num(m[8]),
            valueBase: num(m[9]),
          })
        );
        continue;
      }
      if (section === 'equity' && (m = EQUITY_ROW.exec(t)) && !/^Total\b/i.test(m[1])) {
        const h = holding('scotia', 'equity', '', m[1], m[3], {
          section: 'Equities',
          quantity: num(m[2]),
          avgCostRaw: num(m[4]),
          costBasisType: 'total',
          price: num(m[5]),
          value: num(m[6]),
          valueBase: num(m[7]),
          lastMonthValue: num(m[8]),
          statedChangePct: num(m[9]),
        });
        st.holdings.push(h);
        wrapTarget = h;
        continue;
      }
      if (section === 'fund' && (m = FUND_ROW.exec(t)) && !/^Total\b/i.test(m[1])) {
        st.holdings.push(
          holding('scotia', 'fund', subAccount, m[1], m[2], {
            section: 'Unit Trust',
            avgCostRaw: num(m[3]),
            costBasisType: 'unit',
            quantity: num(m[4]),
            price: num(m[5]),
            value: num(m[6]),
            lastMonthValue: num(m[7]),
            statedChangePct: num(m[8]),
          })
        );
        continue;
      }
      if (
        section &&
        !/^Total\b/i.test(t) &&
        (/^CASH\s/.test(t) || (HOLDING_LIKE.test(t) && /[A-Za-z]{3,}/.test(t)))
      )
        unread++;
      continue;
    }
    if (area === 'activity') {
      if (t === 'CASH') {
        section = 'cash';
        st.cashActivitySection = true;
        continue;
      }
      if (/^Mutual Funds\s*\/\s*Unit Trust$/i.test(t)) {
        section = 'fund';
        continue;
      }
      if (section !== 'cash') continue;
      if ((m = /^(\S+)\s+-\s+(.+?)\s+-\s+([A-Z]{3})$/.exec(t))) {
        cashAccount = m[2];
        cashCurrency = m[3];
        continue;
      }
      if ((m = ACTIVITY_CASH_ROW.exec(t))) {
        const amount = num(m[4]);
        if (amount != null) {
          st.cashActivity.push({
            date: isoDate(m[1]),
            type: m[3],
            amount: roundMoney(Math.abs(amount)),
            currency: cashCurrency || null,
            cashAccount,
          });
        }
      }
    }
  }
  st.pagesSeen = [...pages].sort((a, b) => a - b);
  if (!st.pagesDeclared || st.pagesSeen.length < st.pagesDeclared) st.warnings.push('pages-missing');
  if (st.cashActivitySection && !st.cashActivity.length) st.warnings.push('activity-unread');
  for (let i = 0; i < unread; i++) st.warnings.push('row-unread');
  if (!st.holdings.length) st.warnings.push('no-holdings');
  const ok = !!(st.account && st.periodEnd && st.printedTotal != null);
  if (ok) st.hash = fnv1a(`investment|${st.account}|${st.periodEnd}`);
  return { ok, statement: st };
}

function parseNcbInvestmentStatement(segLines, sourceFile = '') {
  const lines = (Array.isArray(segLines) ? segLines : [])
    .map((line) => String(line == null ? '' : line).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const st = {
    hash: null,
    provider: 'ncb',
    account: null,
    periodStart: null,
    periodEnd: null,
    printedTotal: null,
    portfolioTotal: null,
    fxRates: {},
    classTotals: [],
    pagesDeclared: null,
    pagesSeen: [],
    activityPresent: false,
    cashActivitySection: false,
    cashActivity: [],
    holdings: [],
    warnings: [],
    provenance: statementProvenance('ncb'),
    source_file: sourceFile,
  };
  const pages = new Set();
  let section = null;
  let unread = 0;
  for (const t of lines) {
    let m;
    for (const pm of t.matchAll(PAGE_MARK)) {
      pages.add(Number(pm[1]));
      st.pagesDeclared = Math.max(st.pagesDeclared || 0, Number(pm[2]));
    }
    if (!st.account && (m = /Account Number\s*:\s*([A-Za-z0-9-]+)/i.exec(t))) st.account = m[1];
    if (!st.periodEnd && (m = /Statement Period\s*:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i.exec(t)))
      st.periodEnd = isoDate(m[1]);
    if ((m = NCB_PORTFOLIO_TOTAL.exec(t))) {
      st.portfolioTotal = num(m[1]);
      if (st.printedTotal == null) st.printedTotal = st.portfolioTotal;
      continue;
    }
    if ((m = NCB_GRAND_TOTAL.exec(t))) {
      st.printedTotal = num(m[1]);
      continue;
    }
    const matchedSection = canonicalHoldingSection('ncb', t);
    if (matchedSection) {
      section = { ...matchedSection, raw: t.replace(/\s+[A-Z]{3}$/, '') };
      continue;
    }
    if (section && (m = NCB_CLASS_TOTAL.exec(t))) {
      st.classTotals.push({ label: section.label, sourceLabel: section.raw, value: num(m[1]) });
      section = null;
      continue;
    }
    if (!section || /^Quantity\b|^\/ Nominal\b/i.test(t)) continue;
    const row = NCB_HOLDING_ROW.exec(t);
    const cashRow = section.kind === 'cash' ? NCB_CASH_ROW.exec(t) : null;
    if (row) {
      st.holdings.push(
        holding('ncb', section.kind, '', row[2], 'JMD', {
          section: section.raw,
          quantity: num(row[1]),
          avgCostRaw: num(row[3]),
          costBasisType: 'total',
          price: num(row[4]),
          yield: num(row[5]),
          unrealisedGainLoss: num(row[6]),
          value: num(row[7]),
          valueBase: num(row[7]),
        })
      );
      continue;
    }
    if (cashRow) {
      st.holdings.push(
        holding('ncb', section.kind, '', cashRow[2], 'JMD', {
          section: section.raw,
          quantity: num(cashRow[1]),
          avgCostRaw: num(cashRow[3]),
          costBasisType: 'total',
          unrealisedGainLoss: num(cashRow[4]),
          value: num(cashRow[5]),
          valueBase: num(cashRow[5]),
        })
      );
      continue;
    }
    if (/^\d[\d,]*\.\d{2}\s+.+\d[\d,]*\.\d{2}$/.test(t)) unread++;
  }
  st.pagesSeen = [...pages].sort((a, b) => a - b);
  if (!st.pagesDeclared || st.pagesSeen.length < st.pagesDeclared) st.warnings.push('pages-missing');
  for (let i = 0; i < unread; i++) st.warnings.push('row-unread');
  if (!st.holdings.length) st.warnings.push('no-holdings');
  const ok = !!(st.account && st.periodEnd && st.printedTotal != null);
  if (ok) st.hash = fnv1a(`investment|ncb|${st.account}|${st.periodEnd}`);
  return { ok, statement: st };
}

export function parseInvestmentStatement(segLines, sourceFile = '') {
  return detectInvestmentProvider(segLines) === 'ncb'
    ? parseNcbInvestmentStatement(segLines, sourceFile)
    : parseScotiaInvestmentStatement(segLines, sourceFile);
}

export function parseInvestmentStatements(lines, sourceFile = '') {
  const byHash = new Map();
  let unreadable = 0;
  const provider = detectInvestmentProvider(lines);
  const segments = provider === 'ncb' ? [lines] : splitInvestmentStatements(lines);
  for (const segment of segments) {
    const { ok, statement } = parseInvestmentStatement(segment, sourceFile);
    if (ok) byHash.set(statement.hash, statement);
    else unreadable++;
  }
  return { statements: [...byHash.values()], unreadable };
}

export function investmentStatementFingerprint(statement) {
  const s = statement || {};
  return fnv1a(
    JSON.stringify({
      provider: s.provider || 'scotia',
      account: s.account,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      printedTotal: s.printedTotal,
      fxRates: s.fxRates,
      classTotals: s.classTotals,
      pagesDeclared: s.pagesDeclared,
      pagesSeen: s.pagesSeen,
      activityPresent: s.activityPresent,
      cashActivitySection: s.cashActivitySection,
      cashActivity: s.cashActivity,
      holdings: s.holdings,
      warnings: s.warnings,
      provenance: s.provenance,
    })
  );
}
