export const INCOME_SOURCES_WORDS = {
  label: 'Money in by source',
  group: (typical) => `${typical} a month`,
  glance: (typical, cadence, last) => `${typical} a month · ${cadence} · last ${last}`,
  other: (count, total) => `${count} other ${count === 1 ? 'deposit' : 'deposits'} that ${count === 1 ? 'does' : 'do'} not repeat, ${total} in all`,
  typical: 'Typical month',
  received: 'Received in all',
  months: 'Months seen',
  day: 'Usual day of the month',
  last: 'Last seen',
};

export const TAKE_HOME_WORDS = {
  label: 'Months and kinds behind it',
  take: 'Take-home',
  monthsHeading: 'Complete months',
  setAside: 'set aside as unusual',
  classesHeading: 'A typical month of each kind',
};

const ordinal = (n) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;

export function incomeSourcesModel(sources, { prose, money, monthLabel, categoryLabel }) {
  if (!sources || (!sources.groups.length && !sources.other.count)) return null;
  const named = (category) => category || categoryLabel;
  return {
    label: INCOME_SOURCES_WORDS.label,
    groups: sources.groups.map((group) => ({
      label: named(group.category),
      totalText: INCOME_SOURCES_WORDS.group(prose(group.typical)),
      streams: group.streams.map((stream) => ({
        key: stream.key,
        label: stream.label,
        glance: INCOME_SOURCES_WORDS.glance(prose(stream.typical), stream.cadence, monthLabel(stream.lastMonth)),
        evidence: [
          { label: INCOME_SOURCES_WORDS.typical, value: money(stream.typical) },
          { label: INCOME_SOURCES_WORDS.received, value: money(stream.total) },
          { label: INCOME_SOURCES_WORDS.months, value: String(stream.months) },
          ...(stream.typicalDay ? [{ label: INCOME_SOURCES_WORDS.day, value: ordinal(stream.typicalDay) }] : []),
          { label: INCOME_SOURCES_WORDS.last, value: monthLabel(stream.lastMonth) },
        ],
      })),
    })),
    other: sources.other.count ? INCOME_SOURCES_WORDS.other(sources.other.count, prose(sources.other.total)) : null,
  };
}

export function takeHomeModel(breakdown, { sentence, money, monthLabel, classLabels = {} }) {
  if (!breakdown || !breakdown.monthsUsed) return null;
  return {
    line: `${sentence.lead} ${sentence.amount}${sentence.rest}`,
    label: TAKE_HOME_WORDS.label,
    rows: [{ label: TAKE_HOME_WORDS.take, value: money(breakdown.amount) }],
    monthsHeading: TAKE_HOME_WORDS.monthsHeading,
    months: breakdown.months.map((item) => ({
      label: item.used ? monthLabel(item.month) : `${monthLabel(item.month)} · ${TAKE_HOME_WORDS.setAside}`,
      value: money(item.amount),
      muted: !item.used,
    })),
    classesHeading: TAKE_HOME_WORDS.classesHeading,
    classes: breakdown.classes.map((item) => ({
      label: classLabels[item.incomeClass] || item.incomeClass.charAt(0).toUpperCase() + item.incomeClass.slice(1),
      value: money(item.amount),
    })),
  };
}
