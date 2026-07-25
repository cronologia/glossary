# AGENTS.md — cronologia/glossary

Operating guide for AI coding agents (and humans) working in this repository.
Read this and [`context.md`](context.md) before making changes. The shared
method lives in `cronologia/core` and is **vendored into this repo** at
`.claude/skills/` — start with `sourcing-rules`. The decisions that govern this
repo are in [`adr/`](adr/); the family map is
[`cronologia/core/DEPENDENCIES.md`](https://github.com/cronologia/core/blob/main/DEPENDENCIES.md).

## What this project is

The **shared glossary** of the Cronologia family: short, source-referenced
definitions of the canonical, theological and political vocabulary the
chronologies rely on. One JSON file is the source of truth; a zero-dependency
Node script compiles it into `docs/` — per locale (`en`, `pt`, `es`), an index
page with a stable `#anchor` per term **and one dedicated page per term** at
`https://cronologia.github.io/glossary/<locale>/<term-id>/`. The locale-less
`https://cronologia.github.io/glossary/<term-id>/` — the canonical reference
link the project sites use — stays valid as a redirect stub to the reader's
locale, and the `<term-id>` is identical in every locale.

This repo defines vocabulary. It does not host arguments and it does not carry
a chronology: **definitions only, each cited** — and every dispute about a term
stays in the project repo whose story the dispute belongs to (`adr/0001`).

## Repository map

```
data/glossary.json            SOURCE OF TRUTH — meta, terms[] (id, term, variants,
                              definition, projects[], related[], sources[]),
                              references[] (hand-edited)
data/archives.json            GENERATED — Wayback snapshot cache written by
                              scripts/archive-refs.js in CI (never hand-edited)
data/i18n/{pt,es}.json        GENERATED — machine-translation caches keyed by the
                              English source string, managed by scripts/translate.js
                              (never hand-edited; English is authoritative)
src/styles.css                Stylesheet (copied into the build)
scripts/validate-data.js      Schema check: kebab-case unique ids, non-empty sources[],
                              every source id and related id resolves (runs in CI)
scripts/archive-refs.js       Wayback availability + Save Page Now (CI only, writes archives.json)
scripts/check-links.js        Link-rot report (CI only; NEVER edits data)
scripts/translate.js          Translation-cache manager: --stats reports per-locale
                              coverage, normalizes/prunes data/i18n/<lang>.json
build.js                      Compiler: data/glossary.json -> docs/<lang>/index.html +
                              docs/<lang>/<id>/index.html for en/pt/es, plus the
                              locale-less redirect stubs, sitemap.xml and robots.txt
test/glossary.test.js         node:test: esc, citation/related invariants, per-locale
                              index + term-page render, SEO head, switcher, disclaimer,
                              stable ids across locales, docs/ drift check
adr/                          Decisions that govern this repo
.claude/skills/               GENERATED — vendored copy of cronologia/core skills/
                              (manifest: .claude/skills/_synced.json)
.github/workflows/deploy.yml      CI: validate, test, build, drift check, Pages deploy
.github/workflows/wayback.yml     Weekly preservation: archive-refs.js -> archives.json + docs/
.github/workflows/link-health.yml Weekly link-rot issue (report only)
docs/                         COMPILED OUTPUT, served by GitHub Pages (committed)
```

Not present here, deliberately: `scripts/sync-glossary-terms.js` (this repo is
the *source* of the term ids — the projects vendor them, not the other way
round).

## Working agreements

1. **Edit data, not output.** Change `data/glossary.json`, run `node build.js`,
   commit the regenerated `docs/` in the same change.
2. **Keep the build green.** `node scripts/validate-data.js`, `node --test` and
   `node build.js` must all pass; CI fails if `docs/` drifts.
3. **Definitions only, and cited.** The validator enforces a non-empty
   `sources[]` on every term, and that each id resolves to a `references[]`
   entry. A term with no source does not ship.
4. **Ids are forever, and language-independent.** A term `id` is a public URL.
   Never rename one, and never translate one: `/glossary/{en,pt,es}/<id>/` is
   the same `<id>` in every locale. If the preferred wording changes, keep the
   old id and put the new wording in `term`/`variants` (`adr/0001`).
5. **One repo, one committer per wave.** Exactly one agent owns this dataset at
   a time; `git status` stays empty in repos you were not assigned.
6. **Never hand-edit generated files:** `docs/`, `data/archives.json`,
   `data/i18n/*.json`, `.claude/skills/`.
7. **English is authoritative.** `pt`/`es` are machine-translated and carry a
   visible disclaimer on every page. When a definition changes, re-author the
   affected cache entries — `node scripts/translate.js --stats` reports what is
   missing (`adr/0002`).

## Sourcing rules

The family's five core rules are the `sourcing-rules` skill, vendored at
[`.claude/skills/sourcing-rules/SKILL.md`](.claude/skills/sourcing-rules/SKILL.md)
(canonical copy: `cronologia/core/skills/sourcing-rules/`). Load it before
touching any data file or site copy. How they land here:

- **Cite it, or flag it as unverified** — in this repo the stricter form
  applies: a definition without a citation is not written at all.
- **Attribute, don't assert.** Terms like *schism*, *sedevacantism*,
  *integrismo* and *contra-revolução* are contested. Say what the source says
  and who says it ("can. 751 defines…", "the term is used pejoratively by…"),
  never what the glossary thinks.
- **Sources span the spectrum**, labeled where the perspective is not obvious
  (the `publisher` field carries labels such as "movement-affiliated archive").
- **Time-sensitive statuses must be dated** — a term whose meaning or
  institutional referent changed (e.g. `cdf-ddf`) states the change and when.
- **Testimony is a perspective, not a fact source** — definitions come from
  canon law, official documents, reference works and scholarship.

## Which skills apply here, and when

All ten are vendored under `.claude/skills/`. In practice:

| Skill | Load it when |
|---|---|
| `sourcing-rules` | **Always, first.** Any data edit, any site copy. |
| `data-edit` | Editing `data/glossary.json`: query first, then validate → test → build → commit data + `docs/` together. |
| `ingest-report` | Turning a research report or a project ticket's term requests into entries — verified-with-a-source items only; conflicts recorded, not resolved. |
| `net-access` | A reference host 403s, 406s or is geoblocked. Vault first, desktop UA retry, INCONCLUSIVE ≠ dead, never route around the proxy. |
| `preserve-sources` | Reference hygiene: unarchived refs, `data/archives.json`, link-health output, deciding local vs `cronologia/archive`. |
| `adopt-template` | Porting a renderer, validator rule, test or style from `cronologia/core/template/` — remember this repo's schema differs (terms, not events), so ports are adaptations. |
| `release-work` | Branching, fast-forwarding, committing and pushing a wave; reporting what shipped and what was deferred. |
| `dossier-research`, `mine-video` | Rarely here — they are for the research-heavy project repos (`fsspx`, `tariqa`, `perennialism`, `rcc`). A glossary definition never rests on a video or a dossier; it rests on canon law, an official document, a reference work or scholarship. |
| `bootstrap-project` | Standing up a new sibling repo (not needed for routine work here). |

The vendored copies are **generated**. Fix a skill in `cronologia/core/skills/`
and re-sync; never edit `.claude/skills/` in place:

```bash
python3 ../core/tools/sync-skills.py glossary            # refresh the vendored copies
python3 ../core/tools/sync-skills.py glossary --check    # writes nothing; exit 1 if stale
```

## Agent-side tooling (`cronologia/core/tools`, Python 3 stdlib, read-only)

These never run in CI and never write to `data/`. Use them instead of reading
whole files — `data/glossary.json` is ~36 KB and a full read costs more than
the answer is worth. `dataset-query.py` understands this repo's schema
(`kind=glossary`) as well as the chronology schema.

```bash
python3 ../core/tools/dataset-query.py glossary stats             # term/reference counts, unarchived refs
python3 ../core/tools/dataset-query.py glossary find dhikr        # keyword hits with locators
python3 ../core/tools/dataset-query.py glossary refs --unarchived # references lacking a snapshot
python3 ../core/tools/unverified-report.py glossary --markdown    # unverified flags (expected: zero here)
python3 ../core/tools/xref.py --repos glossary,fsspx,tariqa       # shared-entity consistency
python3 ../core/tools/mine-prep.py <transcript>                   # transcript -> candidate sheet (project repos)
```

`dataset-query.py` prints **locators** (`terms[29]`, `references[13]`) — read
that slice, edit it, move on. `event`/`figure` are chronology subcommands and
return nothing here; `find`, `refs`, `stats` and `unverified` are the useful
ones. Run `xref.py` when a term touches a person or organization that the
project datasets also carry, so the vocabulary stays consistent across repos.

## The operational loop

```bash
node scripts/validate-data.js   # ids, non-empty sources[], source/related ids resolve, i18n caches
node scripts/translate.js --stats # per-locale translation coverage (offline, read-only)
node --test                     # invariants, per-locale render, SEO/disclaimer, docs drift check
node build.js                   # compile data/glossary.json -> docs/{en,pt,es}/ + redirect stubs
git add data docs && git commit  # data + i18n caches + regenerated docs in ONE commit
```

Documentation-only changes must leave `docs/` byte-identical — check with
`git diff --stat -- docs/` before committing.

Adding a term is not finished when it validates: it is finished when the
project repo that needs it links to it. See `context.md`, "What done looks
like".

## Where this repo sits in the family

The canonical map is
[`cronologia/core/DEPENDENCIES.md`](https://github.com/cronologia/core/blob/main/DEPENDENCIES.md).
This repo's own edges:

- **`core`** — consumed **by copy**, never fetched: the preservation and
  link-health scripts and workflows (schema-adapted for `data/glossary.json`),
  the archived-fallback rendering in `build.js`, the skills at
  `.claude/skills/`, and the Python tools above. The build is network-free.
- **The project repos** (`fsspx`, `tariqa`, `perennialism`, `rcc`, and the
  out-of-scope `fsp`, `tl`, `celam`, `grupopuebla`, `tfp`) — they consume this
  repo, and the dependency is **one-way**: they write `[[term-id]]` markers in
  their prose and validate them offline against a **pinned vendored copy** of
  this repo's ids (`data/glossary-terms.json`, refreshed by their own
  `scripts/sync-glossary-terms.js`). This repo depends on none of them and must
  never be edited to match a project's argument. Practically: renaming an id
  breaks their builds; adding one is invisible to them until they re-sync.
- **`glossary` vs the projects — the standing boundary.** Here: what a word
  means, with a citation. There: who used it, when, about whom, and who
  objected. `schism`, `sedevacantism` and `integrismo` are defined here and
  *argued* in `fsspx`; `cebs` and `preferential-option` are defined here and
  argued in `tl`/`rcc`; `tariqa`, `silsila` and `muqaddam` are defined here and
  argued in `tariqa`/`perennialism`. A shared term is defined **once**, here,
  and cross-linked — never re-explained in a project.
- **`archive`** — the private shared vault: a source cited by two or more
  family projects belongs there (its ADR-0001); single-project sources stay in
  the citing repo. Reader-facing citations are always the original URL plus its
  Wayback snapshot, never a raw archive URL. Its ADR-0002 is the standing
  networking policy behind `net-access`.
