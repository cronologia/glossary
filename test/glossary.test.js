'use strict';
// Zero-dependency tests: data invariants + render + docs drift.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { esc, renderPage, renderTermPage } = require('../build.js');

const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'glossary.json'), 'utf8'));

test('esc escapes HTML metacharacters', () => {
  assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(esc(null), '');
});

test('every term is cited and every related id resolves', () => {
  const refIds = new Set(data.references.map((r) => r.id));
  const termIds = new Set(data.terms.map((t) => t.id));
  for (const t of data.terms) {
    assert.ok(t.sources.length > 0, `${t.id} uncited`);
    for (const s of t.sources) assert.ok(refIds.has(s), `${t.id}: unknown source ${s}`);
    for (const r of t.related || []) assert.ok(termIds.has(r), `${t.id}: unknown related ${r}`);
  }
});

test('renderPage anchors every term and carries the analytics tag', () => {
  const html = renderPage(data);
  assert.match(html, /G-R9LV1QZHVE/);
  for (const t of data.terms) assert.ok(html.includes(`id="${t.id}"`), `missing anchor ${t.id}`);
});

test('every term has a dedicated page matching the current render', () => {
  const termById = new Map(data.terms.map((t) => [t.id, t]));
  for (const t of data.terms) {
    const p = path.join(ROOT, 'docs', t.id, 'index.html');
    assert.ok(fs.existsSync(p), `missing page for ${t.id}`);
    assert.equal(fs.readFileSync(p, 'utf8'), renderTermPage(t, data, termById), `${t.id} page drifted — run node build.js`);
  }
});

test('committed docs/index.html is the current render (no drift)', () => {
  const built = fs.readFileSync(path.join(ROOT, 'docs', 'index.html'), 'utf8');
  assert.equal(built, renderPage(data), 'docs/ out of date — run node build.js');
});
