# Roadmap

## Available in v0.1

- Svelte 5 component, local package build, typed public API and CSS theme tokens.
- Framework-neutral core, portable JSON Schema and semantic validator.
- Unified gradient, split rails, nested branches, filtering, full-history search,
  partial/unknown dates, guides, detail expansion and batch archive preview.
- Offline launch-history explorer, URL selections, native launch dialog,
  downloadable data/provenance, and live document playground.
- Component documentation and data methodology in both the app and source docs.

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

Package publication, a public license and hosted deployment are separate decisions.
