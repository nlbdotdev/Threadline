# Performance investigation

Threadline has two separate scaling problems: selecting from all events, and
rendering/measurement of displayed cards. Virtualization addresses the second.

## Measured core work

Measured on macOS arm64, Node v26.8.1. Nine alternating before/after rounds,
median wall-clock milliseconds, one warm-up per implementation. The benchmark
asserts equivalent results before timing. Baseline is Sandbox commit ab2cbb03.
These are Node core timings, not browser interaction latency or FPS. Svelte proxy
access, layout, animations and painting are not represented. The 50,000-event
document is synthetic repetition of the launch fixture with unique IDs.

| Operation          | 7,405 before → after | 50,000 before → after |
| ------------------ | -------------------- | --------------------- |
| Select all         | 0.52 → 0.37 ms       | 5.88 → 4.77 ms        |
| Search Falcon      | 5.92 → 5.54 ms       | 38.02 → 36.33 ms      |
| Search Apollo 11   | 6.05 → 5.82 ms       | 40.72 → 39.87 ms      |
| Parent filter NASA | 4.70 → 0.43 ms       | 31.24 → 2.06 ms       |
| Format 1,000 dates | 16.75 → 0.73 ms      | 18.52 → 0.78 ms       |

Implemented: per-selection maps and descendant sets replace repeated filter
hierarchy searches; three date formatters are reused by precision. Lookup maps are
rebuilt for each selection so editing a document does not silently leave stale
results. Search still rebuilds event text, and receives little improvement.

Geometry now keeps only first/last marker positions per year, rather than copying
growing arrays, and disconnects observers in split views with guides off. Those
changes are supported by source analysis and functional browser checks; they do
not have a claimed measured FPS gain.

## TanStack Virtual: relevant as an opt-in renderer

The initial DOM is already modest: 12 commit cards, 24 highlights, or a 40-card
launch batch. Progressive reveal keeps adding cards; it never removes offscreen
ones. Large sessions therefore still grow the DOM and geometry work.

For large collections, a window-based, dynamically measured list is the best
candidate to preserve page scrolling. TanStack supports framework adapters,
measured sizes, stable item keys, overscan and scroll margins. Svelte's store
adapter requires pushing changed options rather than assuming getters are tracked.
See [Svelte virtualization](https://tanstack.com/table/latest/docs/framework/svelte/guide/virtualization),
[Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer), and
[framework adapters](https://github.com/TanStack/virtual/blob/main/docs/installation.md).

Proposed integration, not a shipped API:

1. Keep the current narrative renderer as default. Add a separate optional virtual
   renderer or renderer adapter, so small timelines avoid the new dependency.
2. Virtualize chronological rows in **one lane**. Threadline rails are category
   decorations; TanStack lanes describe masonry placement and would reorder layout.
3. Key rows by event ID. Measure variable card heights, including year headers and
   expanded snippets. Begin with overscan of five rows and tune against real traces.
4. Build year groups from the entire filtered sequence. Keep rails on a separate
   layer with full virtual height. Draw viewport-local gradients using measured
   visible markers and boundary colors; estimate unseen positions explicitly.
5. Preserve expansion by event ID. Pin a focused row in the extracted range, and
   provide explicit scroll-to-event behavior when filtering removes the anchor.
6. Avoid height-fold exit animations in virtual mode, because they compete with
   size measurement. Preserve rail motion and respect reduced motion.
7. Keep a paged reading mode for browser find, printing and accessibility review.
   Virtual DOM cannot expose all offscreen event text to browser find.

The existing DOM-only year/gradient observer cannot simply be reused unchanged:
it sees only mounted rows. Global positions would otherwise be misleading.
Do not pre-emptively enable requestAnimationFrame-wrapped ResizeObserver processing;
TanStack's documentation recommends measuring a concrete reason first.

## Priority beyond virtualization

| Priority  | Change                                                              | Reason                                                                         |
| --------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Next      | Lazy-load the launch dataset and optional examples/docs             | Git currently also downloads and validates the roughly 3.8 MiB launch fixture  |
| Next      | Prepare normalized search text and sorted IDs per document revision | 50,000-event searches still take about 40 ms in this core benchmark            |
| Next      | Share selection/count work between host and component               | The launch sidebar and timeline currently perform separate selection/sort work |
| Then      | Opt-in TanStack virtual renderer                                    | Prevent unbounded mounted-card growth during long sessions                     |
| As needed | Worker search/validation and chunked data loading                   | Useful if browser traces show main-thread stalls or much larger source files   |

A prepared search index should have explicit lifecycle/version invalidation;
silently caching mutable documents by identity would break the live editor and
Svelte consumers. A worker moves CPU work but adds messaging and payload costs.
CSS content-visibility is an alternative experiment, but retained DOM and direct
measurement of every marker limit its benefit for this implementation.

## Reproduce

```sh
mkdir -p output/performance
git show ab2cbb03:projects/apps/threadline-lab/src/lib/core.ts > output/performance/baseline-core.ts
npm run benchmark -- output/performance/baseline-core.ts
```

Raw measurements go to ignored output/performance/benchmark.json. Without a
baseline argument, the command is a current-code timing smoke check. No network,
upstream data refresh or performance dependency installation is involved.

Before adopting virtualization, measure browser cold start and typing latency,
mounted rows and observer work at 40/400/4,000 disclosed cards, expansion above
the viewport, rapid view switches, and a long mobile scroll. Acceptance should
cover accurate marker colors, no blank ranges, stable focus and scroll anchors,
and bounded mounted rows independent of total event count. No threshold or FPS
guarantee is established by the present core-only measurements.
