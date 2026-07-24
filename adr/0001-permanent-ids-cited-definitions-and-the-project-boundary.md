# ADR-0001 — Permanent term ids, cited definitions, and the project boundary

- **Status:** accepted (2026-07-24)
- **Context repo:** `cronologia/glossary`
- **Builds on:** `cronologia/core` ADR-0002 (vendored glossary and skills),
  ADR-0003 (preservation and link-health split); `cronologia/archive` ADR-0001
  (shared source vault), ADR-0002 (networking and geoblocked sources)

## Context

Every Cronologia chronology needs the same technical vocabulary — canon-law
terms, curial offices, Latin-American ecclesial and political labels, Sufi and
perennialist terminology. Left to themselves, each project re-explains those
words in its own prose, in slightly different wording, with different sources
or none. The definitions then drift apart, and a reader comparing two sites
finds the family contradicting itself about what a word means.

The words are also contested. *Schism*, *sedevacantism*, *integrismo*,
*contra-revolução* are used as accusations by some and as self-descriptions by
others. A glossary that tried to settle those usages would become a party to
the arguments the chronologies exist to document neutrally.

Two mechanics force the rest of this ADR. First, the project builds validate
their `[[term-id]]` markers against these ids, and the term pages are public
URLs already linked from published sites — so an id is not an implementation
detail. Second, the family's build must stay network-free, so the projects
cannot fetch this glossary at build time and the preservation of these
references cannot happen during a build either.

## Decision

1. **Ids are permanent.** A term's `id` is its public URL
   (`https://cronologia.github.io/glossary/<id>/`) and the symbol the project
   builds validate against. It is never renamed and never deleted. If the
   preferred wording changes, the id stays and the new wording goes in `term`
   or `variants`; if a term must genuinely be split or replaced, the old id
   stays as a variant entry pointing at the successor through `related[]`.
   `validate-data.js`
   enforces kebab-case and uniqueness; permanence is a discipline, not a check
   the tooling can perform.
2. **Definitions only, and every one cited.** `validate-data.js` fails the
   build on any term with an empty `sources[]` or an unresolvable source id.
   Contested usage is attributed and dated ("can. 751 defines…", "the term is
   used pejoratively by…"), never asserted in the site's own voice. There are
   no `verified: false` escape hatches here: unlike a chronology, which records
   flagged-but-honest uncertainty, an uncited definition is simply not written.
3. **Arguments stay in the project repos.** Who used a word, about whom, and
   who objected belongs to the chronology that documents it — the projects'
   `disambiguation` sections. This repo carries no events, no dates of its own,
   and no adjudication. The dependency is **one-way**: projects depend on the
   glossary; the glossary depends on no project and is never edited to suit
   one project's reading.
4. **Consumption is by pinned vendored copy, not by fetch.** Projects vendor
   this repo's term ids into their own `data/glossary-terms.json` via their
   `scripts/sync-glossary-terms.js`, commit that copy, and validate `[[…]]`
   markers against it offline (core ADR-0002). Consequently a new term is
   invisible downstream until a project re-syncs — which is correct, and the
   reason decision 1 is absolute: renaming an id would break builds that pinned
   it, and 404 links that were already published.
5. **`data/glossary.json` is the single source of truth; `docs/` is generated.**
   Committed so GitHub Pages can serve it, and CI fails the build if it drifts.
   `data/archives.json` is likewise generated, by `scripts/archive-refs.js`.
   Neither is hand-edited: change the data, run
   `node scripts/validate-data.js && node --test && node build.js`, commit the
   regenerated output in the same change.
6. **Preservation runs out of band, adapted rather than adopted wholesale.**
   `scripts/archive-refs.js` and `scripts/check-links.js` came from the
   `cronologia/core` template and were adapted to this repo's schema (a flat
   `references[]` on `data/glossary.json`, no chronology collections); `build.js`
   renders an "archived" fallback link beside a reference when
   `data/archives.json` has a snapshot, and renders nothing when the file is
   absent — so the build stays network-free. Capture and link-checking happen
   only in scheduled CI (`wayback.yml`, `link-health.yml`); a 403, 429 or 5xx
   is INCONCLUSIVE, not "dead"; the link checker never edits data. Sources
   cited by two or more family projects belong in `cronologia/archive` per its
   ADR-0001. Reader-facing citations are always the original URL plus its
   Wayback snapshot, never a raw archive URL.
7. **Deliberately not adopted from the template:** the i18n/`translate.js`
   pipeline (this site is single-locale English), the chronology renderers and
   their visualization blocks (there are no events here), and
   `sync-glossary-terms.js` — this repo is the *source* of the term ids, so it
   has nothing to sync from. If any of these is ever wanted, it comes down from
   `core` via the `adopt-template` method rather than being invented here.

## Consequences

- The id space only grows. Some ids will read as slightly dated wording
  (`cdf-ddf` outlived the CDF's renaming); that is the price of links that do
  not rot, and `variants` carries the current phrasing.
- A term cannot be "improved" by making it take a side, which occasionally
  makes an entry feel thinner than a partisan reader would like. The depth
  lives in the project repo, one click away.
- Adding a term is a two-repo operation: the definition ships here, the
  `[[term-id]]` link and the re-synced `data/glossary-terms.json` ship in the
  project — in separate commits, by whoever owns each repo for that wave.
- Because the schema is not the chronology schema, template ports are
  adaptations and shared tooling must handle both shapes;
  `core/tools/dataset-query.py` already does (`kind=glossary`), while its
  `event`/`figure` subcommands are inert here.
- The glossary can be built, validated and tested with no network at all, and
  its reference set is preserved anyway — because preservation was moved to CI
  instead of into the build.
