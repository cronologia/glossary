#!/usr/bin/env node
/**
 * Cronologia glossary — static site generator.
 *
 * Zero dependencies. Reads data/glossary.json and compiles a single page into
 * docs/ with one stable anchor per term (e.g. /glossary/#latae-sententiae),
 * so the project sites link to definitions instead of re-explaining them.
 *
 * Usage: node build.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'glossary.json');
const SRC_DIR = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'docs');

// Google Analytics (gtag.js) — shared measurement ID across the Cronologia
// projects; a public identifier, not a secret.
const ANALYTICS = `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-R9LV1QZHVE"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-R9LV1QZHVE');
  </script>`;

const PROJECTS = {
  fsp: { name: 'fsp', url: 'https://cronologia.github.io/fsp/' },
  fsspx: { name: 'fsspx', url: 'https://cronologia.github.io/fsspx/' },
  tl: { name: 'tl', url: 'https://cronologia.github.io/tl/' },
};

function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCites(sources, refNumById) {
  if (!Array.isArray(sources) || sources.length === 0) return '';
  const marks = sources
    .map((s) => (refNumById.has(s)
      ? `<a href="#ref-${refNumById.get(s)}" title="Reference ${refNumById.get(s)}">[${refNumById.get(s)}]</a>`
      : ''))
    .filter(Boolean)
    .join(' ');
  return marks ? `<sup class="cite">${marks}</sup>` : '';
}

function renderTerm(t, refNumById, termById) {
  const related = (t.related || [])
    .filter((id) => termById.has(id))
    .map((id) => `<a href="#${esc(id)}">${esc(termById.get(id).term)}</a>`)
    .join(' · ');
  const projects = (t.projects || [])
    .filter((p) => PROJECTS[p])
    .map((p) => `<a class="proj proj-${esc(p)}" href="${PROJECTS[p].url}">${PROJECTS[p].name}</a>`)
    .join('');
  return `    <article class="term" id="${esc(t.id)}">
      <h3><a class="anchor" href="#${esc(t.id)}">#</a><a class="term-link" href="${esc(t.id)}/">${esc(t.term)}</a></h3>
      ${t.variants ? `<p class="variants">${esc(t.variants)}</p>` : ''}
      <p class="def">${esc(t.definition)}${renderCites(t.sources, refNumById)}</p>
      <p class="meta">${projects}${related ? `<span class="rel">Related: ${related}</span>` : ''}</p>
    </article>`;
}

/**
 * Render a dedicated standalone page for one term, at docs/<id>/index.html —
 * so other Cronologia pages can reference a stable per-term URL
 * (e.g. /glossary/latae-sententiae/). The index page's #anchors keep working.
 */
function renderTermPage(t, data, termById) {
  const { meta, references } = data;
  const used = (t.sources || []).map((id) => references.find((r) => r.id === id)).filter(Boolean);
  const localNum = new Map(used.map((r, i) => [r.id, i + 1]));
  const related = (t.related || [])
    .filter((id) => termById.has(id))
    .map((id) => `<a href="../${esc(id)}/">${esc(termById.get(id).term)}</a>`)
    .join(' · ');
  const projects = (t.projects || [])
    .filter((p) => PROJECTS[p])
    .map((p) => `<a class="proj proj-${esc(p)}" href="${PROJECTS[p].url}">${PROJECTS[p].name}</a>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="${esc(meta.language || 'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(t.term)} — Cronologia Glossary</title>
  <meta name="description" content="${esc(t.definition.slice(0, 155))}">
${ANALYTICS}
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <p class="updated"><a href="../" style="color:#fff">← Cronologia Glossary</a></p>
      <h1>${esc(t.term)}</h1>
      ${t.variants ? `<p class="subtitle">${esc(t.variants)}</p>` : ''}
    </div>
  </header>
  <main class="wrap">
    <section>
      <p class="def">${esc(t.definition)}${renderCites(t.sources, localNum)}</p>
      <p class="meta term-meta">${projects}${related ? `<span class="rel">Related: ${related}</span>` : ''}</p>
    </section>
    <section id="references">
      <h2>Sources</h2>
      <ol class="references">
${used.map((r, i) => `        <li id="ref-${i + 1}"><a href="${esc(r.url)}" rel="noopener noreferrer" target="_blank">${esc(r.title)}</a><span class="ref-meta">${esc(r.publisher)} · ${esc(r.type)}</span></li>`).join('\n')}
      </ol>
    </section>
  </main>
  <footer class="site-footer">
    <div class="wrap"><p>Part of the <a href="../">Cronologia Glossary</a> — every definition cited. Corrections welcome via pull request.</p></div>
  </footer>
</body>
</html>
`;
}

function renderPage(data) {
  const { meta, terms, references } = data;
  const refNumById = new Map(references.map((r, i) => [r.id, i + 1]));
  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const termById = new Map(terms.map((t) => [t.id, t]));

  const index = sorted
    .map((t) => `<a href="#${esc(t.id)}">${esc(t.term)}</a>`)
    .join('\n        ');

  return `<!DOCTYPE html>
<html lang="${esc(meta.language || 'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}">
${ANALYTICS}
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <h1>${esc(meta.title)}</h1>
      <p class="subtitle">${esc(meta.subtitle)}</p>
      <p class="lead">${esc(meta.description)}</p>
      <p class="updated">Last updated: ${esc(meta.lastUpdated)} · ${terms.length} terms</p>
    </div>
  </header>
  <main class="wrap">
    <p class="notice">${esc(meta.dataQualityNote)}</p>
    <nav class="index" aria-label="Term index">
        ${index}
    </nav>
    <section id="terms">
${sorted.map((t) => renderTerm(t, refNumById, termById)).join('\n')}
    </section>
    <section id="references">
      <h2>References</h2>
      <ol class="references">
${references.map((r, i) => `        <li id="ref-${i + 1}"><a href="${esc(r.url)}" rel="noopener noreferrer" target="_blank">${esc(r.title)}</a><span class="ref-meta">${esc(r.publisher)} · ${esc(r.type)}</span></li>`).join('\n')}
      </ol>
    </section>
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <p>Compiled static site generated from <code>data/glossary.json</code> by <code>build.js</code>.
      Part of the <a href="https://cronologia.github.io/">Cronologia</a> project family — corrections welcome via pull request.</p>
    </div>
  </footer>
</body>
</html>
`;
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderPage(data));
  const termById = new Map(data.terms.map((t) => [t.id, t]));
  for (const t of data.terms) {
    const dir = path.join(OUT_DIR, t.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderTermPage(t, data, termById));
  }
  fs.copyFileSync(path.join(SRC_DIR, 'styles.css'), path.join(OUT_DIR, 'styles.css'));
  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');
  console.log(`Built docs/index.html + ${data.terms.length} term pages (${data.references.length} references).`);
}

if (require.main === module) main();

module.exports = { esc, renderCites, renderPage, renderTermPage };
