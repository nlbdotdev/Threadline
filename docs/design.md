# Concept and provenance

Threadline: a **faceted narrative timeline**. One chronological reading can unfold
into multiple related category rails; a unified thread blends through event colors.
Rails express categories and shared chronology, not causation or dependency.

Design reference: Nathan Bennett's portfolio, inspected on local dev at commit
594fc43 (including 35d925c, the Featured gradient thread). Relevant source files:
src/lib/timeline.ts, featured-thread.ts, collection-transition.ts, year-guide.ts,
archive-preview.ts, components/PortfolioItem.svelte and routes/+page.svelte.
Original conversation: codex://threads/01a083b5-d214-74a2-ae8d-e7e0d247b819.

This experiment reimplements the behavior with a neutral document model. It does
not import the portfolio repository, personal entries, imagery, fonts or content.
The fictional studio playground is newly authored sample data.

The Git example reads a bounded first-parent slice of this public Threadline repository.
Its custom card snippet demonstrates commit metadata without coupling Git to the
renderer. Exact UTC instants were added to the date grammar for same-day ordering.

## Portfolio capabilities mapped to v0.1

| Portfolio behavior                      | Threadline v0.1                                                    |
| --------------------------------------- | ------------------------------------------------------------------ |
| Featured blended thread                 | Featured-only unified view; measured color stops                   |
| Everything / category rails             | Named unified or split views over any dimension                    |
| Project → game / website split          | Generic parent / leaf hierarchy                                    |
| Animated row filtering                  | Keyed row transitions and FLIP motion                              |
| Search including history                | Full-document search before disclosure                             |
| Year and entry guides                   | Year guides and default card sequence numbers                      |
| Expand/collapse details                 | Individual and visible-card bulk expansion                         |
| Archive preview                         | Decorative next-row fade and explicit batch reveal                 |
| Scroll-to-reveal archive                | Planned after focus and interaction testing                        |
| Media gallery and modal                 | Host integrations; Lab demonstrates native selection dialog        |
| Current label and themes                | Exact year labels and inheritable CSS tokens; theme switch planned |
| Editorial ordering and end-date sorting | Start-date chronology for now; policy extension planned            |

## Rendering boundaries

Document/schema and selectors are framework-neutral TypeScript. Svelte owns DOM,
geometry measurement, controls, and motion. The Lab owns dataset loading, decade
navigation, URL parameters, additional attribute filters, and selected-launch UI.
Public component/core APIs are documented independently from the experiment data.

Geometry observes actual markers and row sizes, and releases removed row observers.
The full history is searchable but DOM rendering is bounded by disclosure batches.
Only used values get rails; declared order remains stable across filters. Dimensions
with many categories have a labeled overflow rail, preserving real category colors
at the event markers and in the unified gradient.
