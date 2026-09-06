self.process = { exit(c) { if (c) throw new Error('process.exit(' + c + ')'); }, exitCode: 0, argv: [], env: {}, platform: 'browser' };
const lines = [];
console.log = (...a) => lines.push(a.map(String).join(' '));
self.onmessage = async (e) => {
  const file = e.data;
  let error = null;
  try {
    await import('./' + file + '?w=' + Date.now());
  } catch (err) {
    error = String((err && err.stack) || err);
  }
  self.postMessage({ file, out: lines.slice(), error });
};
