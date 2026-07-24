# Project context

Domain background for anyone (human or AI) working on this repository. Pair
with [`AGENTS.md`](AGENTS.md) and [`adr/`](adr/); the family's method lives in
`cronologia/core` and is vendored at `.claude/skills/` (load `sourcing-rules`
first).

## The subject

Not a subject, a **vocabulary**. The Cronologia chronologies document
politically and religiously contested subjects — Catholic traditionalism, the
Latin-American left, liberation theology, the Charismatic Renewal, Sufi orders
and perennialism — and they all run into the same problem: their central words
are technical, foreign, or contested, and often all three. *Latae sententiae*,
*sedeprivationism*, *comunidades eclesiais de base*, *silsila*, *integrismo*,
*philosophia perennis*: a reader cannot follow the story without them, and no
project can afford to re-explain them on every page where they appear.

This repo is the answer: **one cited definition per term, at one permanent
URL**, that every project links to instead of paraphrasing. It is the family's
only repo whose product is words rather than dated events — but it is held to
the same standard as any dataset here: every definition carries a real source,
and contested usage is attributed to whoever uses it, never asserted in the
site's own voice.

## Scope: definitions, not arguments

The line is sharp and it is the reason the repo exists (`adr/0001`):

- **Here:** what a word means, where it comes from, what distinguishes it from
  the term it gets confused with, and a citation for all of that.
- **There (the project repos):** who used the word, when, about whom, on what
  authority, and who objected. The projects' `disambiguation` sections hold the
  disputes; they link here for the definitions.

So `schism` is defined here (can. 751) and *argued* in `fsspx`; `cebs` is
defined here and argued in `tl` and `rcc`; `philosophia-perennis` is defined
here with its four distinct careers and disentangled at length in
`perennialism`. A definition that starts adjudicating a dispute has crossed the
line and belongs in the project.

## Audience

Two audiences at once, which shapes the register:

1. **Readers of the project sites**, arriving on a term page from a `[[…]]`
   link mid-sentence. They want two or three sentences that let them return to
   the chronology, plus a source they can check.
2. **The project builds**, which validate their `[[term-id]]` markers against a
   pinned copy of this repo's ids. For them a term id is an API symbol.

## Current contents and scale

`data/glossary.json` carries **34 terms** and **43 references** (last updated
2026-07-20; 19 terms also record `variants` — alternate spellings, translations
and the near-synonym they must not be confused with). Every term is cited;
`unverified-report.py` reports **zero** unverified flags, as it should for a
repo whose rule is "cited or not written".

Roughly, the terms cluster as:

- **Canon law and curial vocabulary** (`latae-sententiae`, `excommunication`,
  `suspension-a-divinis`, `schism`, `canonical-irregularity`, `motu-proprio`,
  `pia-unio`, `cdf-ddf`, `notification`, `nunciature`, `prelature`) — the
  machinery both the traditionalist and the liberation-theology stories run on.
- **Catholic traditionalism and its right-wing neighbours** (`sedevacantism`,
  `sedeprivationism`, `conclavism`, `integrismo`, `contra-revolucao`).
- **Latin-American Catholicism and the left** (`cebs`, `preferential-option`,
  `praxis`, `teologia-del-pueblo`, `cnbb`, `encontro-encuentro`,
  `foro-vs-grupo`) — including two entries that exist purely to stop a
  conflation (Foro de São Paulo vs Grupo de Puebla; *encontro* the common noun
  vs the numbered meeting series).
- **Charismatic Renewal** (`carisma`, `batismo-no-espirito`).
- **Sufism and the Traditionalist School** (`tariqa`, `silsila`, `muqaddam`,
  `khalifa`, `zawiya`, `dhikr`, `bayah`, `philosophia-perennis`,
  `traditionalist-school`).

Each term declares the projects that use it (`projects[]`): `fsspx` 16, `tl` 9,
`tariqa` 8, `fsp` 4, `rcc` 3, and 2 each for `tfp`, `grupopuebla` and
`perennialism` — which doubles as a map of which project pulls hardest on the
shared vocabulary.

References are mostly reference works and primary documents: 30 encyclopedia
entries (24 Wikipedia EN, plus PT/ES and Britannica), 9 primary sources (mainly
`vatican.va` and the 1983 Code of Canon Law), 2 academic and 2 official-site.
That mix is appropriate for definitions and would not be for a chronology.

## What the site renders

- `docs/index.html` — the full glossary: a term index, every term with a stable
  `#anchor`, its variants, its cited definition, its project chips and its
  related-term links, then the numbered reference list.
- `docs/<term-id>/index.html` — **one dedicated page per term** (34 of them),
  each with its own locally-numbered `Sources` list. This is the canonical
  link target: `https://cronologia.github.io/glossary/latae-sententiae/`.
- **Preservation:** 41 of the 43 references carry an Internet Archive fallback
  link rendered from `data/archives.json`; the weekly `wayback.yml` workflow
  tops that up in CI and `link-health.yml` reports rot into a single issue
  without ever touching the data. The build itself is network-free and works
  with no `archives.json` at all.

## What "done" looks like for a unit of work here

A term is finished when **all** of these hold:

1. `id` is a kebab-case slug that will still be the right URL in five years —
   because it is a URL, permanently (`adr/0001`). Prefer the term itself over a
   framing (`cdf-ddf`, not `vatican-doctrine-office`).
2. The definition is **short** (two to five sentences), says what the word
   means, and where a confusion is likely, says explicitly what it is *not*
   (`integrismo` ≠ Brazilian *integralismo*; `sedeprivationism` ≠
   `sedevacantism`; the Foro ≠ the Grupo).
3. Contested usage is **attributed**, with a date where the meaning or the
   institution changed. No adjudication: the argument goes to the project.
4. `sources[]` is non-empty and every id resolves; new `references[]` entries
   carry `title`, `url`, `publisher` and `type`, with the perspective labeled
   in `publisher` when it is not obvious.
5. `projects[]` names the repos that will link the term, and `related[]`
   points at the sibling terms a reader will want next (both directions —
   adding a term usually means editing the term it relates to).
6. `node scripts/validate-data.js && node --test && node build.js` all pass,
   and the regenerated `docs/` (index **and** the new term page) is committed
   in the same change.
7. The project repo that needed the term links to it — with a `[[term-id]]`
   marker, after re-running its own `scripts/sync-glossary-terms.js` so its
   pinned id list contains the new id. Until that happens the term is published
   but unused, and the unit of work is only half done. That last step is the
   project repo's commit, not this one's: **one repo, one committer per wave**.

For a documentation- or tooling-only change (like this one), "done" adds one
more condition: `git diff --stat -- docs/` is empty. Prose about the repo must
never move a byte of generated output.
