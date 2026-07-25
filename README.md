# Cronologia — Glossary

The **shared glossary** of the [Cronologia](https://cronologia.github.io)
project family: short, source-referenced definitions of the canonical,
theological and political vocabulary the chronologies rely on — with **one
dedicated page per term**, so other pages reference a stable term-specific
URL instead of re-explaining the definition:

```
https://cronologia.github.io/glossary/latae-sententiae/
https://cronologia.github.io/glossary/sedevacantism/
https://cronologia.github.io/glossary/cebs/
```

(The index page at `/glossary/` keeps `#anchor` permalinks too; the dedicated
page is the canonical reference link.)

The site is published in **English, Portuguese and Spanish**, with the locale as
a path segment after the project — `/glossary/en/…`, `/glossary/pt/…`,
`/glossary/es/…`. **Term ids are language-independent**, so the URLs above keep
working (they redirect to the reader's locale) and
`/glossary/pt/latae-sententiae/` is the same term as
`/glossary/en/latae-sententiae/`. English is authoritative and hand-written; the
`pt` and `es` pages are machine-translated from committed caches
(`data/i18n/<lang>.json`) and say so, visibly, on every page. See
[`adr/0002`](adr/0002-locales-pt-es-with-language-independent-term-urls.md).

Same architecture as every Cronologia site (see `cronologia/core`): a single
JSON file is the source of truth, compiled by a zero-dependency Node script
into `docs/`, served by GitHub Pages.

## Rules of this repo

- **Definitions only, and cited.** Every term carries a non-empty `sources[]`
  — a glossary of contested vocabulary is itself a Cronologia-grade artifact.
- **Arguments stay in the projects.** The projects' disambiguation sections
  hold the disputes; they link here for the terms.
- **Stable URLs are API.** A term's `id` is its public page URL — never
  rename one, and never translate one; if a term must change, keep the old id
  as a variant entry.

## Editing

Edit `data/glossary.json` (term: `id` kebab-case slug, `term`, optional
`variants`, `definition`, `projects[]`, `related[]`, `sources[]`), then:

```bash
node scripts/validate-data.js && node --test && node build.js
```

Translations live in `data/i18n/{pt,es}.json`, keyed by the English source
string; `node scripts/translate.js --stats` reports per-locale coverage. Commit
the regenerated `docs/` in the same change — CI enforces all of it.

## Working here (agents and humans)

- [`AGENTS.md`](AGENTS.md) — repo map, working agreements, which shared skills
  apply, the agent-side tooling in `cronologia/core/tools`, and this repo's
  place in the family.
- [`context.md`](context.md) — domain background, current contents and scale,
  and what "done" looks like for a term.
- [`adr/`](adr/) — the standing decisions that govern this repo.
- `.claude/skills/` — **generated** vendored copy of the `cronologia/core`
  skills (start with `sourcing-rules`); refresh with
  `python3 ../core/tools/sync-skills.py glossary`, never edit in place.

### Publish (GitHub Pages)

Settings → Pages → Source: **GitHub Actions**, and Actions variable
**`ENABLE_PAGES=true`**. The workflow deploys on push to `main` and supports
manual dispatch. (Enable Pages only while `main` is the default branch — the
`github-pages` environment pins its allowed branch at enable time.)

## License

[MIT](LICENSE)
