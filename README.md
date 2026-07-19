# Cronologia — Glossary

The **shared glossary** of the [Cronologia](https://cronologia.github.io)
project family: short, source-referenced definitions of the canonical,
theological and political vocabulary the chronologies rely on — with **one
stable anchor per term**, so project pages link to a definition instead of
re-explaining it:

```
https://cronologia.github.io/glossary/#latae-sententiae
https://cronologia.github.io/glossary/#sedevacantism
https://cronologia.github.io/glossary/#cebs
```

Same architecture as every Cronologia site (see `cronologia/core`): a single
JSON file is the source of truth, compiled by a zero-dependency Node script
into `docs/`, served by GitHub Pages.

## Rules of this repo

- **Definitions only, and cited.** Every term carries a non-empty `sources[]`
  — a glossary of contested vocabulary is itself a Cronologia-grade artifact.
- **Arguments stay in the projects.** The projects' disambiguation sections
  hold the disputes; they link here for the terms.
- **Stable anchors are API.** A term's `id` is its public URL — never rename
  one; if a term must change, keep the old id as a variant entry.

## Editing

Edit `data/glossary.json` (term: `id` kebab-case slug, `term`, optional
`variants`, `definition`, `projects[]`, `related[]`, `sources[]`), then:

```bash
node scripts/validate-data.js && node --test && node build.js
```

Commit the regenerated `docs/` in the same change — CI enforces all of it.

### Publish (GitHub Pages)

Settings → Pages → Source: **GitHub Actions**, and Actions variable
**`ENABLE_PAGES=true`**. The workflow deploys on push to `main` and supports
manual dispatch. (Enable Pages only while `main` is the default branch — the
`github-pages` environment pins its allowed branch at enable time.)

## License

[MIT](LICENSE)
