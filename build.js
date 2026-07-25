#!/usr/bin/env node
/**
 * Cronologia glossary — static site generator.
 *
 * Zero dependencies. Reads data/glossary.json and compiles, for every locale,
 * an index page with one stable anchor per term plus a dedicated page per term
 * (e.g. /glossary/en/latae-sententiae/), so the project sites link to
 * definitions instead of re-explaining them.
 *
 * Usage: node build.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'glossary.json');
const ARCHIVES_FILE = path.join(ROOT, 'data', 'archives.json');
const I18N_DIR = path.join(ROOT, 'data', 'i18n');
const SRC_DIR = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'docs');

/* ---------------------------------------------------------------------------
 * Multi-language (i18n) + SEO — adopted from the cronologia/core template (see
 * core/template/build.js, its adrs/0001-multilingual.md and cronologia/core#9),
 * with the read paths pointed at this repo's dataset: the glossary's source of
 * truth is data/glossary.json (terms[] with per-term sources[] plus a top-level
 * references[]), not data/chronology.json. English is authoritative and
 * hand-written; es/pt are machine-translated from committed caches
 * (data/i18n/<lang>.json, managed by scripts/translate.js — never hand-edit)
 * and carry a visible disclaimer.
 *
 * The language is a path segment AFTER the project (/glossary/{en,es,pt}/…)
 * because GitHub Pages serves each repo under https://<org>.github.io/<repo>/.
 * Content is localized at the DATA level (a key-based walk, so every renderer is
 * covered automatically); the compiler's own chrome is localized from the UI
 * table below. English (empty dict) is byte-identical to a pre-i18n render
 * except for the new /en/ path + SEO head and language switcher.
 *
 * TERM IDS ARE PERMANENT URLS. They are never translated or localized: the same
 * `<id>` addresses the term in every locale (/glossary/{en,es,pt}/<id>/) and the
 * same `#<id>` anchor works on every locale's index, so other Cronologia sites
 * can deep-link to a term and add the reader's locale segment without breaking
 * the link. The pre-i18n URLs (/glossary/ and /glossary/<id>/) keep working:
 * each becomes a redirect stub to the same route in the visitor's locale.
 * ------------------------------------------------------------------------- */

const LOCALES = ['en', 'es', 'pt'];
const OG_LOCALE = { en: 'en_US', es: 'es_ES', pt: 'pt_BR' };

// Data fields whose string values are prose to translate. Reference titles/
// publishers, proper names, URLs, ids, dates and numbers are NOT here, and the
// whole `references` array is skipped, so bibliographic data is passed verbatim.
// `term`, `definition` and `variants` are this dataset's prose fields (the
// template's chronology keys are kept so the two key sets stay in sync).
const TRANSLATABLE_KEYS = new Set([
  'title', 'subtitle', 'description', 'dataQualityNote', 'label', 'value', 'text',
  'place', 'role', 'country', 'notes', 'note', 'heading', 'navLabel', 'summary',
  'detail', 'status', 'relation', 'unitNote', 'sourceLabel', 'display', 'unit', 'edgeLabel',
  'term', 'definition', 'variants',
]);

// Interface strings the compiler emits itself (everything not sourced from data).
const UI = {
  en: {
    siteName: 'Cronologia Glossary',
    lastUpdated: 'Last updated:', language: 'Language',
    terms: (n) => `${n} terms`,
    termIndex: 'Term index',
    references: 'References', sources: 'Sources', related: 'Related:',
    back: '← Cronologia Glossary',
    refTitle: (n) => `Reference ${n}`,
    archived: 'archived',
    footer: 'Compiled static site generated from <code>data/glossary.json</code> by <code>build.js</code>.\n      Part of the <a href="https://cronologia.github.io/">Cronologia</a> project family — corrections welcome via pull request.',
    termFooter: 'Part of the <a href="../">Cronologia Glossary</a> — every definition cited. Corrections welcome via pull request.',
    disclaimer: null,
  },
  es: {
    siteName: 'Glosario Cronologia',
    lastUpdated: 'Última actualización:', language: 'Idioma',
    terms: (n) => `${n} términos`,
    termIndex: 'Índice de términos',
    references: 'Referencias', sources: 'Fuentes', related: 'Relacionados:',
    back: '← Glosario Cronologia',
    refTitle: (n) => `Referencia ${n}`,
    archived: 'archivado',
    footer: 'Sitio estático compilado a partir de <code>data/glossary.json</code> por <code>build.js</code>.\n      Parte de la familia de proyectos <a href="https://cronologia.github.io/">Cronologia</a> — correcciones bienvenidas mediante pull request.',
    termFooter: 'Parte del <a href="../">Glosario Cronologia</a> — cada definición está citada. Correcciones bienvenidas mediante pull request.',
    disclaimer: 'Traducción automática del inglés; la página en inglés es la versión de referencia.',
  },
  pt: {
    siteName: 'Glossário Cronologia',
    lastUpdated: 'Última atualização:', language: 'Idioma',
    terms: (n) => `${n} termos`,
    termIndex: 'Índice de termos',
    references: 'Referências', sources: 'Fontes', related: 'Relacionados:',
    back: '← Glossário Cronologia',
    refTitle: (n) => `Referência ${n}`,
    archived: 'arquivado',
    footer: 'Site estático compilado a partir de <code>data/glossary.json</code> por <code>build.js</code>.\n      Parte da família de projetos <a href="https://cronologia.github.io/">Cronologia</a> — correções bem-vindas via pull request.',
    termFooter: 'Parte do <a href="../">Glossário Cronologia</a> — cada definição é citada. Correções bem-vindas via pull request.',
    disclaimer: 'Tradução automática do inglês; a página em inglês é a versão de referência.',
  },
};

/** Load a locale's committed translation cache ({ english: translated }). */
function loadDict(lang) {
  if (lang === 'en') return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${lang}.json`), 'utf8'));
    return (parsed && parsed.strings) || {};
  } catch {
    return {};
  }
}

/** Normalize a public base URL to exactly one trailing slash. */
function siteBase(meta) {
  const raw = (meta && meta.siteUrl) || 'https://cronologia.github.io/glossary/';
  return raw.replace(/\/+$/, '') + '/';
}

/** dict hit, else the English source string. */
function translator(dict) {
  return (s) => (s !== null && s !== undefined && Object.prototype.hasOwnProperty.call(dict, s) ? dict[s] : s);
}

/**
 * Deep-copy `data` with every translatable prose field replaced by its
 * translation (fallback: English), and meta.language set to `lang`. The whole
 * `references` array is passed through verbatim (bibliographic data), and `id`
 * is not a translatable key, so term URLs are identical in every locale. With an
 * empty dictionary (English) the values are unchanged, so the render stays
 * byte-identical to a pre-i18n build.
 */
function localizeData(data, dict, lang) {
  const t = translator(dict);
  const walk = (val, key) => {
    if (key === 'references') return val; // never translate bibliographic entries
    if (Array.isArray(val)) return val.map((v) => walk(v, key));
    if (val && typeof val === 'object') {
      const out = {};
      for (const k of Object.keys(val)) out[k] = walk(val[k], k);
      return out;
    }
    if (typeof val === 'string' && TRANSLATABLE_KEYS.has(key)) return t(val);
    return val;
  };
  const copy = walk(data, null);
  copy.meta = Object.assign({}, copy.meta, { language: lang });
  return copy;
}

/** Every page path (relative to a locale root) the site emits, in build order. */
function routesFor(data) {
  return ['', ...data.terms.map((t) => `${t.id}/`)];
}

/** Path segments in a route ('' → 0, 'latae-sententiae/' → 1). */
function segCount(route) {
  return route ? route.split('/').filter(Boolean).length : 0;
}

/** Relative prefix that climbs `n` directories ('./' at zero). */
function relUp(n) {
  return n === 0 ? './' : '../'.repeat(n);
}

/** hreflang + canonical alternates for one route across every locale. */
function alternates(base, route, lang) {
  const url = (l) => `${base}${l}/${route}`;
  const links = LOCALES.map((l) => `  <link rel="alternate" hreflang="${l}" href="${esc(url(l))}">`).join('\n');
  return `  <link rel="canonical" href="${esc(url(lang))}">\n${links}\n  <link rel="alternate" hreflang="x-default" href="${esc(base)}">`;
}

/**
 * Localized <head> SEO block (canonical/hreflang/OG/Twitter/JSON-LD). The
 * JSON-LD payload is supplied by the caller: DefinedTermSet for the index,
 * DefinedTerm for a term page (glossary#3).
 */
function seoHead(base, route, lang, { title, description, jsonLd }) {
  const pageUrl = `${base}${lang}/${route}`;
  return `${alternates(base, route, lang)}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(title)}">
  <meta property="og:locale" content="${OG_LOCALE[lang] || 'en_US'}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(pageUrl)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2).split('\n').map((l) => '  ' + l).join('\n')}
  </script>`;
}

/** Path-preserving language switcher (swap only the locale segment). */
function langSwitcher(route, lang, ui) {
  const up = relUp(segCount(route) + 1);
  const links = LOCALES.map((l) => (l === lang
    ? `<span class="lang-current" aria-current="true">${l.toUpperCase()}</span>`
    : `<a href="${up}${l}/${route}" hreflang="${l}">${l.toUpperCase()}</a>`)).join('');
  return `<nav class="lang-switch" aria-label="${esc(ui.language)}">${links}</nav>`;
}

/**
 * A redirect stub for one route at the pre-i18n (locale-less) URL: it sends the
 * visitor to the same route in their preferred locale. Emitted for `/glossary/`
 * AND for every `/glossary/<term-id>/`, so the deep links the other Cronologia
 * sites already publish keep resolving.
 */
function renderStub(base, route, title) {
  const up = relUp(segCount(route));
  const alt = LOCALES.map((l) => `  <link rel="alternate" hreflang="${l}" href="${esc(base + l + '/' + route)}">`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="canonical" href="${esc(base + 'en/' + route)}">
${alt}
  <link rel="alternate" hreflang="x-default" href="${esc(base + 'en/' + route)}">
  <script>
    (function () {
      var supported = ${JSON.stringify(LOCALES)};
      var stored = null; try { stored = localStorage.getItem('lang'); } catch (e) {}
      var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
      var pick = supported.indexOf(stored) >= 0 ? stored : (supported.indexOf(nav) >= 0 ? nav : 'en');
      location.replace('${up}' + pick + '/${route}');
    })();
  </script>
  <noscript><meta http-equiv="refresh" content="0; url=${up}en/${route}"></noscript>
  <title>${esc(title)}</title>
</head>
<body><p>Redirecting… <a href="${up}en/${route}">English</a> · <a href="${up}es/${route}">Español</a> · <a href="${up}pt/${route}">Português</a></p></body>
</html>
`;
}

/** sitemap.xml enumerating every route × locale with hreflang alternates. */
function renderSitemap(base, routes) {
  const urls = [];
  for (const route of routes) {
    for (const lang of LOCALES) {
      const alts = LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(base + l + '/' + route)}"/>`).join('\n');
      urls.push(`  <url>
    <loc>${esc(base + lang + '/' + route)}</loc>
${alts}
    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(base + 'en/' + route)}"/>
  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

function renderRobots(base) {
  return `User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n`;
}

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
  grupopuebla: { name: 'grupopuebla', url: 'https://cronologia.github.io/grupopuebla/' },
  perennialism: { name: 'perennialism', url: 'https://cronologia.github.io/perennialism/' },
  rcc: { name: 'rcc', url: 'https://cronologia.github.io/rcc/' },
  tariqa: { name: 'tariqa', url: 'https://cronologia.github.io/tariqa/' },
  tfp: { name: 'tfp', url: 'https://cronologia.github.io/tfp/' },
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

/** Format a 14-digit Wayback timestamp (YYYYMMDDhhmmss) as YYYY-MM-DD. */
function formatArchiveTs(ts) {
  if (!ts || String(ts).length < 8) return '';
  const s = String(ts);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/**
 * Load the machine-generated Wayback snapshot cache (url -> snapshot) written
 * by scripts/archive-refs.js. Returns {} when data/archives.json is absent, so
 * the build stays network-free and works before the archiver has ever run.
 * The cache is keyed by reference URL and therefore locale-independent; only the
 * visible "archived" label comes from the per-locale UI table.
 */
function loadArchives() {
  try {
    const parsed = JSON.parse(fs.readFileSync(ARCHIVES_FILE, 'utf8'));
    return (parsed && parsed.snapshots) || {};
  } catch {
    return {};
  }
}

/**
 * Render the "archived" fallback link for a reference URL, or '' when no
 * snapshot is recorded. Appended after the reference's publisher/type metadata.
 */
function archivedLink(url, archives, ui = UI.en) {
  const snap = archives && archives[url];
  if (!snap || !snap.archiveUrl) return '';
  const ts = snap.timestamp ? ` ${esc(formatArchiveTs(snap.timestamp))}` : '';
  return ` · <a class="archive-link" href="${esc(snap.archiveUrl)}" rel="noopener noreferrer" target="_blank">${esc(ui.archived)}${ts}</a>`;
}

function renderCites(sources, refNumById, ui = UI.en) {
  if (!Array.isArray(sources) || sources.length === 0) return '';
  const marks = sources
    .map((s) => (refNumById.has(s)
      ? `<a href="#ref-${refNumById.get(s)}" title="${esc(ui.refTitle(refNumById.get(s)))}">[${refNumById.get(s)}]</a>`
      : ''))
    .filter(Boolean)
    .join(' ');
  return marks ? `<sup class="cite">${marks}</sup>` : '';
}

function renderTerm(t, refNumById, termById, ui) {
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
      <p class="def">${esc(t.definition)}${renderCites(t.sources, refNumById, ui)}</p>
      <p class="meta">${projects}${related ? `<span class="rel">${esc(ui.related)} ${related}</span>` : ''}</p>
    </article>`;
}

/**
 * Render a dedicated standalone page for one term, at
 * docs/<lang>/<id>/index.html — so other Cronologia pages can reference a stable
 * per-term URL (e.g. /glossary/en/latae-sententiae/). The id is never localized,
 * so the same path exists in every locale; the index page's #anchors keep
 * working too.
 */
function renderTermPage(t, data, termById, archives = loadArchives(), opts = {}) {
  const { meta, references } = data;
  const lang = opts.lang || (meta && meta.language) || 'en';
  const ui = UI[lang] || UI.en;
  const base = opts.base || siteBase(meta);
  const route = opts.route !== undefined ? opts.route : `${t.id}/`;
  const up = relUp(segCount(route) + 1);
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
  const title = `${t.term} — ${ui.siteName}`;
  const description = t.definition.slice(0, 155);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: t.term,
    description,
    url: `${base}${lang}/${route}`,
    inLanguage: lang,
    termCode: t.id,
    inDefinedTermSet: `${base}${lang}/`,
  };
  return `<!DOCTYPE html>
<html lang="${esc(meta.language || 'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
${ANALYTICS}
  <link rel="stylesheet" href="${up}styles.css">
${seoHead(base, route, lang, { title, description, jsonLd })}
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      ${langSwitcher(route, lang, ui)}
      <p class="updated"><a href="../" style="color:#fff">${esc(ui.back)}</a></p>
      <h1>${esc(t.term)}</h1>
      ${t.variants ? `<p class="subtitle">${esc(t.variants)}</p>` : ''}
    </div>
  </header>${ui.disclaimer ? `\n  <div class="i18n-disclaimer" role="note">🌐 ${esc(ui.disclaimer)}</div>` : ''}
  <main class="wrap">
    <section>
      <p class="def">${esc(t.definition)}${renderCites(t.sources, localNum, ui)}</p>
      <p class="meta term-meta">${projects}${related ? `<span class="rel">${esc(ui.related)} ${related}</span>` : ''}</p>
    </section>
    <section id="references">
      <h2>${esc(ui.sources)}</h2>
      <ol class="references">
${used.map((r, i) => `        <li id="ref-${i + 1}"><a href="${esc(r.url)}" rel="noopener noreferrer" target="_blank">${esc(r.title)}</a><span class="ref-meta">${esc(r.publisher)} · ${esc(r.type)}${archivedLink(r.url, archives, ui)}</span></li>`).join('\n')}
      </ol>
    </section>
  </main>
  <footer class="site-footer">
    <div class="wrap"><p>${ui.termFooter}</p></div>
  </footer>
</body>
</html>
`;
}

function renderPage(data, archives = loadArchives(), opts = {}) {
  const { meta, terms, references } = data;
  const lang = opts.lang || (meta && meta.language) || 'en';
  const ui = UI[lang] || UI.en;
  const base = opts.base || siteBase(meta);
  const route = opts.route || '';
  const up = relUp(segCount(route) + 1);
  const refNumById = new Map(references.map((r, i) => [r.id, i + 1]));
  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const termById = new Map(terms.map((t) => [t.id, t]));

  const index = sorted
    .map((t) => `<a href="#${esc(t.id)}">${esc(t.term)}</a>`)
    .join('\n        ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: meta.title,
    description: meta.description,
    url: `${base}${lang}/${route}`,
    inLanguage: lang,
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      url: `${base}${lang}/${t.id}/`,
      termCode: t.id,
    })),
  };

  return `<!DOCTYPE html>
<html lang="${esc(meta.language || 'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}">
${ANALYTICS}
  <link rel="stylesheet" href="${up}styles.css">
${seoHead(base, route, lang, { title: meta.title, description: meta.description, jsonLd })}
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      ${langSwitcher(route, lang, ui)}
      <h1>${esc(meta.title)}</h1>
      <p class="subtitle">${esc(meta.subtitle)}</p>
      <p class="lead">${esc(meta.description)}</p>
      <p class="updated">${esc(ui.lastUpdated)} ${esc(meta.lastUpdated)} · ${esc(ui.terms(terms.length))}</p>
    </div>
  </header>${ui.disclaimer ? `\n  <div class="i18n-disclaimer" role="note">🌐 ${esc(ui.disclaimer)}</div>` : ''}
  <main class="wrap">
    <p class="notice">${esc(meta.dataQualityNote)}</p>
    <nav class="index" aria-label="${esc(ui.termIndex)}">
        ${index}
    </nav>
    <section id="terms">
${sorted.map((t) => renderTerm(t, refNumById, termById, ui)).join('\n')}
    </section>
    <section id="references">
      <h2>${esc(ui.references)}</h2>
      <ol class="references">
${references.map((r, i) => `        <li id="ref-${i + 1}"><a href="${esc(r.url)}" rel="noopener noreferrer" target="_blank">${esc(r.title)}</a><span class="ref-meta">${esc(r.publisher)} · ${esc(r.type)}${archivedLink(r.url, archives, ui)}</span></li>`).join('\n')}
      </ol>
    </section>
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <p>${ui.footer}</p>
    </div>
  </footer>
</body>
</html>
`;
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const archives = loadArchives();
  const base = siteBase(data.meta);
  const routes = routesFor(data);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const lang of LOCALES) {
    const localized = localizeData(data, loadDict(lang), lang);
    const dir = path.join(OUT_DIR, lang);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPage(localized, archives, { lang, base, route: '' }));
    const termById = new Map(localized.terms.map((t) => [t.id, t]));
    for (const t of localized.terms) {
      const termDir = path.join(dir, t.id);
      fs.mkdirSync(termDir, { recursive: true });
      fs.writeFileSync(
        path.join(termDir, 'index.html'),
        renderTermPage(t, localized, termById, archives, { lang, base, route: `${t.id}/` })
      );
    }
  }

  // Locale-less redirect stubs so every pre-i18n URL keeps working.
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderStub(base, '', 'Cronologia'));
  for (const t of data.terms) {
    const stubDir = path.join(OUT_DIR, t.id);
    fs.mkdirSync(stubDir, { recursive: true });
    fs.writeFileSync(path.join(stubDir, 'index.html'), renderStub(base, `${t.id}/`, `${t.term} — Cronologia Glossary`));
  }

  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), renderSitemap(base, routes));
  fs.writeFileSync(path.join(OUT_DIR, 'robots.txt'), renderRobots(base));
  fs.copyFileSync(path.join(SRC_DIR, 'styles.css'), path.join(OUT_DIR, 'styles.css'));
  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

  const archivedRefs = data.references.filter((r) => archives[r.url] && archives[r.url].archiveUrl).length;
  console.log(
    `Built ${LOCALES.length} locales (${LOCALES.join(', ')}) × ${routes.length} route(s) ` +
    `+ ${data.terms.length + 1} redirect stub(s), sitemap, robots — ` +
    `${data.terms.length} terms, ${data.references.length} references, ${archivedRefs} with archive fallback.`
  );
}

if (require.main === module) main();

module.exports = {
  esc, formatArchiveTs, renderCites, renderPage, renderTermPage,
  LOCALES, OG_LOCALE, UI, TRANSLATABLE_KEYS, loadDict, loadArchives, siteBase, translator,
  localizeData, routesFor, segCount, relUp, alternates, seoHead, langSwitcher,
  renderStub, renderSitemap, renderRobots,
};
