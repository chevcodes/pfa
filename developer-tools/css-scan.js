import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const METRIC_NAMES = [
  'offScaleSpacing',
  'offScaleFontSizes',
  'offTokenRadii',
  'important',
  'multiFileSelectors',
  'idSelectors',
  'deepSelectors',
  'staticJsxPx',
];
const SPACING_PROPERTIES = /^(?:padding(?:-.+)?|margin(?:-.+)?|gap|row-gap|column-gap)$/i;
const RADIUS_TOKEN = /var\(\s*--(?:radius|r)-[\w-]+/i;
const FONT_TOKEN = /var\(\s*--(?:t|metric)-[\w-]+/i;
const SCALE = new Set([2, 4, 8, 12, 16, 20, 24, 32, 40]);

function blankComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, ' '));
}

function lineAt(source, offset) {
  return source.slice(0, offset).split(/\r?\n/).length;
}

function findBoundary(source, start, end) {
  let quote = '';
  let parens = 0;
  let brackets = 0;
  for (let i = start; i < end; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') parens++;
    else if (char === ')') parens = Math.max(0, parens - 1);
    else if (char === '[') brackets++;
    else if (char === ']') brackets = Math.max(0, brackets - 1);
    else if (!parens && !brackets && (char === '{' || char === ';' || char === '}')) return i;
  }
  return end;
}

function matchingBrace(source, start, end) {
  let depth = 1;
  let quote = '';
  for (let i = start + 1; i < end; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return i;
  }
  return end;
}

function splitOutside(source, delimiter) {
  const parts = [];
  let start = 0;
  let quote = '';
  let parens = 0;
  let brackets = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') parens++;
    else if (char === ')') parens = Math.max(0, parens - 1);
    else if (char === '[') brackets++;
    else if (char === ']') brackets = Math.max(0, brackets - 1);
    else if (char === delimiter && !parens && !brackets) {
      parts.push(source.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(source.slice(start));
  return parts;
}

function propertyColon(declaration) {
  let quote = '';
  let parens = 0;
  let brackets = 0;
  for (let i = 0; i < declaration.length; i++) {
    const char = declaration[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') parens++;
    else if (char === ')') parens = Math.max(0, parens - 1);
    else if (char === '[') brackets++;
    else if (char === ']') brackets = Math.max(0, brackets - 1);
    else if (char === ':' && !parens && !brackets) return i;
  }
  return -1;
}

function parseDeclarations(source, offset, fullSource) {
  let cursor = 0;
  return splitOutside(source, ';')
    .map((raw) => {
      const colon = propertyColon(raw);
      if (colon < 0) return null;
      const property = raw.slice(0, colon).trim().toLowerCase();
      const value = raw.slice(colon + 1).trim();
      if (!property || !value) return null;
      const localOffset = source.indexOf(raw, cursor);
      cursor = Math.max(0, localOffset) + raw.length + 1;
      return { property, value, line: lineAt(fullSource, offset + Math.max(0, localOffset)) };
    })
    .filter(Boolean);
}

function parseRules(source, start = 0, end = source.length, layer = null, output = []) {
  let cursor = start;
  while (cursor < end) {
    while (cursor < end && /[\s;]/.test(source[cursor])) cursor++;
    if (cursor >= end || source[cursor] === '}') return output;
    const preludeStart = cursor;
    const boundary = findBoundary(source, cursor, end);
    const prelude = source.slice(cursor, boundary).trim();
    if (boundary >= end) break;
    if (source[boundary] === ';' || source[boundary] === '}') {
      cursor = boundary + 1;
      continue;
    }
    const close = matchingBrace(source, boundary, end);
    const body = source.slice(boundary + 1, close);
    const line = lineAt(source, preludeStart);
    if (prelude.startsWith('@')) {
      const atRule = /^@([\w-]+)/.exec(prelude)?.[1]?.toLowerCase();
      if (atRule && !['keyframes', '-webkit-keyframes', 'font-face', 'property', 'counter-style'].includes(atRule)) {
        const nextLayer = atRule === 'layer' ? prelude.replace(/^@layer\s*/i, '').trim() || layer : layer;
        parseRules(source, boundary + 1, close, nextLayer, output);
      }
    } else {
      const selectors = splitOutside(prelude, ',').map((selector) => selector.trim()).filter(Boolean);
      const declarations = parseDeclarations(body, boundary + 1, source);
      output.push({ selectors, declarations, line, layer });
      if (body.includes('{')) parseRules(source, boundary + 1, close, layer, output);
    }
    cursor = close + 1;
  }
  return output;
}

function emptyMetrics() {
  return Object.fromEntries(METRIC_NAMES.map((name) => [name, 0]));
}

function finding(file, metric, line, selector, property, value) {
  return { file, metric, line, selector, property, value };
}

function cssRecords(source, file) {
  const cleaned = blankComments(source);
  return { file, source: cleaned, rules: parseRules(cleaned) };
}

function isZeroOrAuto(value) {
  return /^(?:0(?:\.0+)?(?:px|rem|em)?|auto|normal)$/i.test(value.trim());
}

function analyseCss(record, options = {}) {
  const metrics = emptyMetrics();
  const findings = [];
  const selectors = [];
  const printOnly = options.printOnly || record.file.endsWith('/print.css');
  const fontRemTokens = options.fontRemTokens || new Set();
  const seenInFile = new Set();
  for (const rule of record.rules) {
    for (const selector of rule.selectors) {
      if (!seenInFile.has(selector)) {
        seenInFile.add(selector);
        selectors.push({ selector, line: rule.line, layer: rule.layer });
      }
    }
    for (const declaration of rule.declarations) {
      const { property, value, line } = declaration;
      const selector = rule.selectors.join(', ');
      if (!printOnly && SPACING_PROPERTIES.test(property)) {
        const pxMatches = [...value.matchAll(/(-?(?:\d+\.?\d*|\.\d+))\s*px\b/gi)];
        for (const match of pxMatches) {
          const amount = Number(match[1]);
          if (SCALE.has(amount)) continue;
          metrics.offScaleSpacing++;
          findings.push(finding(record.file, 'offScaleSpacing', line, selector, property, match[0]));
        }
        if (!pxMatches.length && /(?:rem|em)\b/i.test(value) && !/var\(\s*--/i.test(value)) {
          metrics.offScaleSpacing++;
          findings.push(finding(record.file, 'offScaleSpacing', line, selector, property, value));
        }
        if (!pxMatches.length && !isZeroOrAuto(value) && !/(?:var\(\s*--|calc\([^)]*var\(\s*--|%|\b(?:vh|vw|dvh|dvw|fr)\b)/i.test(value) && !/(?:rem|em)\b/i.test(value)) {
          if (/^-?(?:\d*\.)?\d+(?:\s|$)/.test(value) && !/^0(?:\s|$)/.test(value)) {
            metrics.offScaleSpacing++;
            findings.push(finding(record.file, 'offScaleSpacing', line, selector, property, value));
          }
        }
      }
      if (!printOnly && property === 'font-size') {
        const normalized = value.replace(/\s+/g, '').toLowerCase();
        const valid = FONT_TOKEN.test(value) || normalized === 'inherit' || fontRemTokens.has(normalized);
        if (!valid) {
          metrics.offScaleFontSizes++;
          findings.push(finding(record.file, 'offScaleFontSizes', line, selector, property, value));
        }
      }
      if (!printOnly && property === 'border-radius') {
        const normalized = value.replace(/\s+/g, '').toLowerCase();
        const valid = RADIUS_TOKEN.test(value) || /^(?:0(?:px|%)?|(?:0\s+){1,3}0)$/i.test(normalized);
        if (!valid) {
          metrics.offTokenRadii++;
          findings.push(finding(record.file, 'offTokenRadii', line, selector, property, value));
        }
      }
      if (!printOnly && /!important\b/i.test(value)) {
        metrics.important++;
        findings.push(finding(record.file, 'important', line, selector, property, value));
      }
    }
  }
  for (const { selector, line } of selectors) {
    if (selector.includes('#')) {
      metrics.idSelectors++;
      findings.push(finding(record.file, 'idSelectors', line, selector, 'selector', selector));
    }
    if (combinatorCount(selector) >= 4) {
      metrics.deepSelectors++;
      findings.push(finding(record.file, 'deepSelectors', line, selector, 'selector', selector));
    }
  }
  return { file: record.file, metrics, findings, selectors };
}

function combinatorCount(selector) {
  let count = 0;
  let quote = '';
  let parens = 0;
  let brackets = 0;
  let pendingSpace = false;
  let previous = false;
  let previousCombinator = false;
  for (let i = 0; i < selector.length; i++) {
    const char = selector[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') parens++;
    else if (char === ')') parens = Math.max(0, parens - 1);
    else if (char === '[') brackets++;
    else if (char === ']') brackets = Math.max(0, brackets - 1);
    if (parens || brackets) continue;
    if (/\s/.test(char)) {
      if (previous && !previousCombinator) pendingSpace = true;
      continue;
    }
    if (char === '>' || char === '+' || char === '~') {
      count++;
      previous = true;
      previousCombinator = true;
      pendingSpace = false;
      continue;
    }
    if (pendingSpace && previous) count++;
    pendingSpace = false;
    previous = char !== ',';
    previousCombinator = false;
  }
  return count;
}

function listFiles(dir, accept, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) listFiles(full, accept, out);
    else if (accept(name, full)) out.push(full);
  }
  return out;
}

function jsxFindings(source, file) {
  const metrics = emptyMetrics();
  const findings = [];
  const push = (line, value, property) => {
    metrics.staticJsxPx++;
    findings.push(finding(file, 'staticJsxPx', line, '', property, value));
  };
  const styleObject = /style\s*=\s*\{\{([\s\S]*?)\}\}/g;
  for (const match of source.matchAll(styleObject)) {
    const body = match[1];
    for (const value of body.matchAll(/(["'`])([^"'`]*?\b\d+(?:\.\d+)?px\b[^"'`]*)\1/g)) {
      push(lineAt(source, match.index + value.index), value[2], 'inline-style');
    }
  }
  for (const match of source.matchAll(/\[[^\]\r\n]*\b\d+(?:\.\d+)?px\b[^\]\r\n]*\]/g)) {
    push(lineAt(source, match.index), match[0], 'tailwind-arbitrary');
  }
  return { file, metrics, findings, selectors: [] };
}

function addDuplicateSelectorCounts(results) {
  const selectorFiles = new Map();
  for (const result of results) {
    for (const { selector, line, layer } of result.selectors) {
      const definitions = selectorFiles.get(selector) || new Map();
      definitions.set(result.file, { line, layer });
      selectorFiles.set(selector, definitions);
    }
  }
  const duplicates = [...selectorFiles.entries()].filter(([, definitions]) => definitions.size > 1);
  for (const [selector, definitions] of duplicates) {
    for (const [file, location] of definitions) {
      const result = results.find((entry) => entry.file === file);
      result.metrics.multiFileSelectors++;
      result.findings.push(finding(file, 'multiFileSelectors', location.line, selector, 'selector', selector));
    }
  }
  return duplicates.map(([selector, definitions]) => ({ selector, definitions: Object.fromEntries(definitions) }));
}

function totalsOf(results, duplicateSelectorCount) {
  const totals = emptyMetrics();
  for (const result of results) {
    for (const name of METRIC_NAMES) totals[name] += result.metrics[name];
  }
  totals.multiFileSelectors = duplicateSelectorCount;
  return totals;
}

export function scanCssText(source, file = 'scratch.css') {
  const record = cssRecords(source, file);
  const rootFontRemTokens = new Set();
  for (const rule of record.rules) {
    if (!rule.selectors.some((selector) => /:root|:host/.test(selector))) continue;
    for (const declaration of rule.declarations) {
      if (/^--(?:t|metric)-/.test(declaration.property) && /^(?:\d*\.)?\d+rem$/i.test(declaration.value.trim())) {
        rootFontRemTokens.add(declaration.value.replace(/\s+/g, '').toLowerCase());
      }
    }
  }
  return analyseCss(record, { fontRemTokens: rootFontRemTokens });
}

export function scanRepository(root) {
  const cssFiles = [
    ...readdirSync(join(root, 'interface')).filter((name) => name.endsWith('.css')).map((name) => join(root, 'interface', name)),
    ...readdirSync(join(root, 'react-ui', 'styles')).filter((name) => name.endsWith('.css')).map((name) => join(root, 'react-ui', 'styles', name)),
  ].sort();
  const jsxFiles = listFiles(join(root, 'react-ui'), (name) => /\.(?:jsx|tsx)$/.test(name));
  const cssRecordsList = cssFiles.map((full) => cssRecords(readFileSync(full, 'utf8'), relative(root, full).split(sep).join('/')));
  const fontRemTokens = new Set();
  for (const record of cssRecordsList) {
    for (const rule of record.rules) {
      if (!rule.selectors.some((selector) => /:root|:host/.test(selector))) continue;
      for (const declaration of rule.declarations) {
        if (/^--(?:t|metric)-/.test(declaration.property) && /^(?:\d*\.)?\d+rem$/i.test(declaration.value.trim())) {
          fontRemTokens.add(declaration.value.replace(/\s+/g, '').toLowerCase());
        }
      }
    }
  }
  const cssResults = cssRecordsList.map((record) => analyseCss(record, { fontRemTokens }));
  const jsxResults = jsxFiles.map((full) => {
    const file = relative(root, full).split(sep).join('/');
    return jsxFindings(readFileSync(full, 'utf8'), file);
  });
  const results = [...cssResults, ...jsxResults].sort((a, b) => a.file.localeCompare(b.file));
  const duplicateSelectors = addDuplicateSelectorCounts(cssResults);
  const files = Object.fromEntries(results.map((result) => [result.file, result.metrics]));
  const findings = results.flatMap((result) => result.findings);
  return { metrics: METRIC_NAMES, files, totals: totalsOf(results, duplicateSelectors.length), findings, duplicateSelectors };
}

export { METRIC_NAMES };
