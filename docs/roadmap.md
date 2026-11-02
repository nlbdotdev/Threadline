# Roadmap

## Current state

Reconciled November 2, 2026 against the standalone repository at `66ed3a7`.
The canonical project is [nlbdotdev/Threadline](https://github.com/nlbdotdev/Threadline),
with [hosted examples and documentation](https://threadline.nlb.dev). The former
Sandbox project is historical; continue development in this repository.

Threadline and Threadline Lab are the agreed component/system and experiment
names. Svelte support and documentation remain first-class; React and Vue are
planned adapters over the same portable schema and TypeScript core.

The spaceflight fixture has 7,405 orbital/deep-space attempts. The public Git
example now uses 80 Svelte commits; the original 12-commit Sandbox example was
superseded during extraction. Rails describe categories, not Git ancestry, and
card spacing does not measure elapsed time.

## Available in v0.1

- Svelte 5 component, local package build, typed public API and CSS theme tokens.
- Framework-neutral core, portable JSON Schema and semantic validator.
- Unified gradient, split rails, nested branches, filtering, full-history search,
  partial/unknown dates, guides, detail expansion and batch archive preview.
- Offline launch-history explorer, URL selections, native launch dialog,
  downloadable data/provenance, and live document playground.
- Component documentation and data methodology in both the app and source docs.
- Public Svelte Git-history example with attributed, revision-pinned metadata.
- Optimized parent filtering, reused date formatters, and conditional geometry
  observers. Historical core-only measurements and reproduction instructions are
  in [performance.md](performance.md); they are not browser FPS guarantees.

## Proposed performance continuation

The following is the investigation's recommendation, not a scheduled commitment:
profile cold loading and typing in the browser, then prioritize lazy dataset
loading, explicit search-index invalidation, and shared selection/count work.
Evaluate an optional TanStack renderer after those improvements; no virtualizer
dependency or renderer is implemented yet.

Before adopting virtualization, check variable-height expansion, focus and scroll
anchors, year/gradient geometry, and browser find/print behavior. Preserve a normal
reading mode for small collections. The integration outline and measurement cases
live in [performance.md](performance.md), rather than a separate backlog.

## Next: strengthen the Svelte reference

SSR-safe rendering, controlled expansion, media adapters, focus behavior during
filtering, optional intentional-scroll archive reveal, a theme selector, configurable
ordering/editorial placement, validation errors by field, more precise country and
agency enrichment, and an automated package-consumer fixture.

## Planned: React and Vue

Native @nlb/threadline-react and @nlb/threadline-vue renderers consuming the same
document version and TypeScript core. No iframe or Svelte-wrapper dependency.
Share date, filtering, hierarchy, rail assignment and accessible behavior fixtures.
Use equivalent render props/slots for event cards. Maintain Svelte support and documentation as other renderers are introduced. No adapter packages exist yet.

## Planned: richer chronology

Virtualization is an opt-in renderer candidate after search indexing and lazy data
loading; see [measured performance findings](performance.md). Keep ordinary narrative
rendering for small collections, and adapt rail/year geometry to virtual positions.

Proportional time as a separate view, duration geometry, BCE years, uncertainty
bounds, multi-rail relationship markers, virtualization, and dense aggregate views.
Preserve a clear distinction between narrative spacing and a quantitative time scale.

## More experiments

1. Suborbital spaceflight, including human flights, with explicit scope controls.
2. Mathematical discoveries: uncertainty, simultaneous discovery and attribution.
3. American history: overlapping themes and multi-perspective accounts.
4. Scientific discoveries: evidence sources, revisions and independent work.

Threadline is MIT licensed and the demo is hosted. npm publication remains a separate decision.
