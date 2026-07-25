# ADR 0002 — PT + ES locales, with language-independent term URLs

Status: Accepted · Applies to: cronologia/glossary · See: glossary#3,
[cronologia/core#9](https://github.com/cronologia/core/issues/9) and
`core/template/adrs/0001-multilingual.md`

## Context

The glossary is the shared vocabulary the other Cronologia sites link into, so
it is the highest-value site to translate first: a PT or ES reader following a
`[[term-id]]` link from a project page should land on a definition in their own
language. The org-wide design was already decided in core#9 and implemented in
`core/template/build.js`; this ADR records only what adopting it here required,
because the glossary's dataset is `data/glossary.json` (`terms[]` with per-term
`sources[]` plus a top-level `references[]`), not the template's
`data/chronology.json`.

## Decision

1. **Adopt the template, do not redesign it.** `LOCALES`, `TRANSLATABLE_KEYS`,
   `loadDict`, `localizeData`, `alternates`, `seoHead`, `langSwitcher`, the
   redirect stub, `renderSitemap`/`renderRobots`, the UI-string table and the
   `.lang-switch`/`.i18n-disclaimer` CSS are copied from
   `cronologia/core → template/`. Local changes are limited to the read paths
   and to this dataset's own prose fields (`term`, `definition`, `variants`
   added to `TRANSLATABLE_KEYS`).
2. **Term ids are never translated.** `id` is not a translatable key, so
   `/glossary/{en,pt,es}/<id>/` and the index `#<id>` anchor are identical in
   every locale. Only `term`, `variants` and `definition` are translated
   (`adr/0001`: ids are forever — this extends that to "and language-
   independent").
3. **Every pre-i18n URL keeps working.** Both `/glossary/` **and** every
   `/glossary/<term-id>/` — the links the project sites already publish — are
   emitted as redirect stubs to the same route in the visitor's locale. This is
   broader than the template's single root stub, because this site's deep links
   are its public contract.
4. **Per-locale SEO, with glossary-appropriate JSON-LD.** The index emits
   `DefinedTermSet` (listing every term with its stable URL), each term page a
   `DefinedTerm` with `termCode` = the id and `inDefinedTermSet` = the locale's
   index — as requested in glossary#3, in place of the template's `WebSite`.
5. **Machine translation, no review gate, visible disclaimer.** `pt`/`es` come
   from committed caches at `data/i18n/<lang>.json`, authored offline (there is
   no translation backend at build or runtime) and reported by
   `node scripts/translate.js --stats`. Every non-English page carries the
   "machine-translated; English is authoritative" banner in the body, because
   these definitions are contested and attributed.
6. **Bibliographic data is never translated.** The `references` array is
   skipped by the localizing walk, so reference titles, publishers, types and
   URLs are byte-identical in every locale. Only the visible `archived` label
   comes from the per-locale UI table; `data/archives.json` is keyed by URL and
   is locale-independent.

## Consequences

- The build emits `docs/{en,pt,es}/index.html` + `docs/{en,pt,es}/<id>/` for all
  34 terms, plus 35 redirect stubs, `sitemap.xml` and `robots.txt`. The drift
  test covers every locale, every term page and every stub.
- English content is unchanged: localizing with an empty dictionary is the
  identity transform. The English pages differ from the pre-i18n build only by
  their new `/en/` path, the SEO head and the language switcher.
- The caches are generated data. When a definition changes, the affected entry
  must be re-authored or the locale silently falls back to English — the
  validator fails on stale keys, and `--stats` reports missing ones.
- Translations must not drift from what a definition's citation supports:
  attributed claims stay attributed and hedges stay hedged in the target
  language. That constraint is on the translator, not on the build.
