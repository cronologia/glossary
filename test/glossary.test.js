'use strict';
// Zero-dependency tests: data invariants + render + per-locale docs drift.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  esc, renderPage, renderTermPage, renderStub, renderSitemap, renderRobots,
  LOCALES, loadDict, loadArchives, siteBase, localizeData, routesFor, langSwitcher, relUp, segCount,
} = require('../build.js');

const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'glossary.json'), 'utf8'));
const base = siteBase(data.meta);
const archives = loadArchives();

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
  const html = renderPage(data, archives);
  assert.match(html, /G-R9LV1QZHVE/);
  for (const t of data.terms) assert.ok(html.includes(`id="${t.id}"`), `missing anchor ${t.id}`);
});

/* --- i18n (adopted from the cronologia/core template, core#9) -------------- */

test('English render is the identity localization (content unchanged)', () => {
  const en = localizeData(data, loadDict('en'), 'en');
  assert.equal(JSON.stringify(en.terms), JSON.stringify(data.terms));
  assert.equal(JSON.stringify(en.references), JSON.stringify(data.references));
});

test('term ids — the permanent URLs — are never localized', () => {
  const ids = data.terms.map((t) => t.id);
  for (const lang of LOCALES) {
    const localized = localizeData(data, loadDict(lang), lang);
    assert.deepEqual(localized.terms.map((t) => t.id), ids, `${lang}: term ids changed`);
    // The same #anchor and the same /<id>/ path must exist in every locale.
    const html = renderPage(localized, archives, { lang, base, route: '' });
    for (const id of ids) {
      assert.ok(html.includes(`id="${id}"`), `${lang}: missing anchor ${id}`);
      assert.ok(html.includes(`href="${id}/"`), `${lang}: missing term link ${id}/`);
    }
  }
});

test('every locale renders the index with the right lang, SEO, switcher and disclaimer', () => {
  for (const lang of LOCALES) {
    const html = renderPage(localizeData(data, loadDict(lang), lang), archives, { lang, base, route: '' });
    assert.match(html, /<!DOCTYPE html>/);
    assert.match(html, /G-R9LV1QZHVE/, `${lang}: analytics tag missing`);
    assert.match(html, new RegExp(`<html lang="${lang}"`), `${lang}: wrong <html lang>`);
    assert.ok(html.includes(`<link rel="canonical" href="${base}${lang}/">`), `${lang}: canonical missing`);
    for (const l of LOCALES) assert.ok(html.includes(`hreflang="${l}" href="${base}${l}/"`), `${lang}: hreflang ${l} missing`);
    assert.ok(html.includes('hreflang="x-default"'), `${lang}: x-default missing`);
    assert.ok(html.includes('"@type": "DefinedTermSet"'), `${lang}: DefinedTermSet JSON-LD missing`);
    assert.ok(html.includes(`"inLanguage": "${lang}"`), `${lang}: JSON-LD inLanguage wrong`);
    assert.ok(html.includes('href="../styles.css"'), `${lang}: stylesheet path not locale-relative`);
    assert.match(html, /class="lang-switch"/, `${lang}: language switcher missing`);
    if (lang === 'en') assert.ok(!html.includes('i18n-disclaimer'), 'English page must not carry the disclaimer');
    else assert.match(html, /class="i18n-disclaimer"/, `${lang}: machine-translation disclaimer missing`);
    for (const r of data.references) {
      assert.ok(html.includes(r.url.replace(/&/g, '&amp;')), `${lang}: reference ${r.id} not rendered`);
    }
  }
});

test('every locale renders each term page with per-term SEO and the disclaimer', () => {
  for (const lang of LOCALES) {
    const localized = localizeData(data, loadDict(lang), lang);
    const termById = new Map(localized.terms.map((t) => [t.id, t]));
    for (const t of localized.terms) {
      const route = `${t.id}/`;
      const html = renderTermPage(t, localized, termById, archives, { lang, base, route });
      assert.match(html, new RegExp(`<html lang="${lang}"`), `${lang}/${t.id}: wrong <html lang>`);
      assert.ok(html.includes(`<link rel="canonical" href="${base}${lang}/${route}">`), `${lang}/${t.id}: canonical missing`);
      for (const l of LOCALES) {
        assert.ok(html.includes(`hreflang="${l}" href="${base}${l}/${route}"`), `${lang}/${t.id}: hreflang ${l} missing`);
      }
      assert.ok(html.includes('"@type": "DefinedTerm"'), `${lang}/${t.id}: DefinedTerm JSON-LD missing`);
      assert.ok(html.includes(`"termCode": "${t.id}"`), `${lang}/${t.id}: termCode missing`);
      assert.ok(html.includes('href="../../styles.css"'), `${lang}/${t.id}: stylesheet path wrong`);
      assert.match(html, /class="lang-switch"/, `${lang}/${t.id}: language switcher missing`);
      if (lang === 'en') assert.ok(!html.includes('i18n-disclaimer'), `en/${t.id}: English page must not carry the disclaimer`);
      else assert.match(html, /class="i18n-disclaimer"/, `${lang}/${t.id}: disclaimer missing`);
    }
  }
});

test('the language switcher preserves the path and only swaps the locale segment', () => {
  const idx = langSwitcher('', 'pt', require('../build.js').UI.pt);
  assert.match(idx, /<span class="lang-current" aria-current="true">PT<\/span>/);
  assert.match(idx, /href="\.\.\/en\/"/);
  assert.match(idx, /href="\.\.\/es\/"/);
  const term = langSwitcher('schism/', 'es', require('../build.js').UI.es);
  assert.match(term, /href="\.\.\/\.\.\/en\/schism\/"/);
  assert.match(term, /href="\.\.\/\.\.\/pt\/schism\/"/);
  assert.equal(segCount(''), 0);
  assert.equal(relUp(0), './');
});

test('pt and es caches cover every translatable string and translate the terms', () => {
  const en = renderPage(data, archives, { lang: 'en', base, route: '' });
  for (const lang of LOCALES.filter((l) => l !== 'en')) {
    const dict = loadDict(lang);
    assert.ok(Object.keys(dict).length > 0, `${lang}: translation cache is empty`);
    for (const t of data.terms) {
      assert.ok(Object.prototype.hasOwnProperty.call(dict, t.term), `${lang}: term "${t.term}" not in cache`);
      assert.ok(Object.prototype.hasOwnProperty.call(dict, t.definition), `${lang}: definition of ${t.id} not in cache`);
    }
    const html = renderPage(localizeData(data, dict, lang), archives, { lang, base, route: '' });
    assert.notEqual(html, en, `${lang}: page identical to English`);
    assert.ok(html.includes(dict[data.meta.subtitle]), `${lang}: translated subtitle not rendered`);
  }
});

test('sitemap lists every route × locale with alternates; robots points to it', () => {
  const routes = routesFor(data);
  assert.equal(routes.length, data.terms.length + 1);
  const sitemap = renderSitemap(base, routes);
  assert.match(sitemap, /<\?xml/);
  assert.match(sitemap, /xmlns:xhtml=/);
  for (const route of routes) for (const lang of LOCALES) {
    assert.ok(sitemap.includes(`<loc>${base}${lang}/${route}</loc>`), `sitemap missing ${lang}/${route}`);
  }
  assert.ok(renderRobots(base).includes(`Sitemap: ${base}sitemap.xml`));
});

test('the locale-less URLs are redirect stubs, not content', () => {
  const root = renderStub(base, '', 'Cronologia');
  assert.match(root, /location\.replace/);
  assert.match(root, /hreflang="x-default"/);
  assert.ok(!root.includes('id="terms"'), 'root stub should not contain page content');
  const term = renderStub(base, 'schism/', 'Schism — Cronologia Glossary');
  assert.match(term, /location\.replace\('\.\.\/' \+ pick \+ '\/schism\/'\)/);
  assert.ok(term.includes(`href="${base}en/schism/"`), 'term stub canonical missing');
});

test('committed docs/ is the current render for every locale (no drift)', () => {
  const docs = path.join(ROOT, 'docs');
  assert.equal(fs.readFileSync(path.join(docs, 'index.html'), 'utf8'), renderStub(base, '', 'Cronologia'), 'root stub drift — run node build.js');
  assert.equal(fs.readFileSync(path.join(docs, 'sitemap.xml'), 'utf8'), renderSitemap(base, routesFor(data)), 'sitemap drift — run node build.js');
  assert.equal(fs.readFileSync(path.join(docs, 'robots.txt'), 'utf8'), renderRobots(base), 'robots drift — run node build.js');
  for (const t of data.terms) {
    assert.equal(
      fs.readFileSync(path.join(docs, t.id, 'index.html'), 'utf8'),
      renderStub(base, `${t.id}/`, `${t.term} — Cronologia Glossary`),
      `docs/${t.id}/ stub drift — run node build.js`
    );
  }
  for (const lang of LOCALES) {
    const localized = localizeData(data, loadDict(lang), lang);
    assert.equal(
      fs.readFileSync(path.join(docs, lang, 'index.html'), 'utf8'),
      renderPage(localized, archives, { lang, base, route: '' }),
      `docs/${lang}/ out of date — run node build.js`
    );
    const termById = new Map(localized.terms.map((t) => [t.id, t]));
    for (const t of localized.terms) {
      const p = path.join(docs, lang, t.id, 'index.html');
      assert.ok(fs.existsSync(p), `missing page for ${lang}/${t.id}`);
      assert.equal(
        fs.readFileSync(p, 'utf8'),
        renderTermPage(t, localized, termById, archives, { lang, base, route: `${t.id}/` }),
        `docs/${lang}/${t.id}/ drifted — run node build.js`
      );
    }
  }
});
