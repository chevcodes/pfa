export function wrapTreemapLabel(value, width, height, padding) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  if (!words.length || innerWidth < 24 || innerHeight < 12) return null;
  for (let fontSize = 18; fontSize >= 10; fontSize -= 0.5) {
    const lineHeight = fontSize * 1.16;
    if (words.some((word) => word.length * fontSize * 0.64 > innerWidth)) continue;
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length * fontSize * 0.64 <= innerWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 3 && lines.length * lineHeight <= innerHeight) return { lines, fontSize, lineHeight };
  }
  return null;
}
