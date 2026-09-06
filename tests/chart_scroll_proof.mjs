import assert from 'node:assert/strict';
import test from 'node:test';
import { markScrollAffordance } from '../application/core/shared-helpers.js';

test('a chart kept at its latest month stays there on resize without overriding manual scrolling', () => {
  const originalObserver = globalThis.ResizeObserver;
  let resize;
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
  };
  try {
    const listeners = new Map();
    const attributes = new Map();
    const node = {
      scrollWidth: 400,
      clientWidth: 336,
      scrollLeft: 0,
      classList: { add() {} },
      addEventListener(name, callback) { listeners.set(name, callback); },
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
    };
    markScrollAffordance(node, true);
    assert.equal(node.scrollLeft, 64);
    node.clientWidth = 257;
    resize();
    assert.equal(node.scrollLeft, 143);
    assert.equal(attributes.get('data-overflow'), 'start');
    node.scrollLeft = 20;
    listeners.get('scroll')();
    node.clientWidth = 250;
    resize();
    assert.equal(node.scrollLeft, 20);
    assert.equal(attributes.get('data-overflow'), 'both');
  } finally {
    globalThis.ResizeObserver = originalObserver;
  }
});
