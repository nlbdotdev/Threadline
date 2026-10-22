<script lang="ts">
  import { flip } from 'svelte/animate';
  import { cubicInOut } from 'svelte/easing';
  import type { Snippet } from 'svelte';
  import type { TransitionConfig } from 'svelte/transition';
  import type { ThreadlineDocument, TimelineEvent } from './schema.js';
  import { formatDate, railsFor, railFor, valueFor, selectEvents, type Selection } from './core.js';
  import { geometry } from './geometry.js';

  interface Props {
    document: ThreadlineDocument;
    view?: string;
    query?: string;
    order?: 'asc' | 'desc';
    filters?: Selection['filters'];
    from?: string;
    to?: string;
    pageSize?: number;
    maxRails?: number;
    guides?: boolean;
    density?: 'comfortable' | 'compact';
    item?: Snippet<[TimelineEvent, { expanded: boolean; toggle: () => void }]>;
    details?: Snippet<[TimelineEvent]>;
    onselect?: (event: TimelineEvent) => void;
  }
  let {
    document: doc,
    view = $bindable(''),
    query = $bindable(''),
    order = $bindable('asc'),
    filters = {},
    from,
    to,
    pageSize = 40,
    maxRails = 7,
    guides = $bindable(false),
    density = 'comfortable',
    item,
    details,
    onselect,
  }: Props = $props();
  const activeView = $derived(doc.views.find((x) => x.id === view) ?? doc.views[0]);
  const rails = $derived(railsFor(doc, activeView, Math.max(2, maxRails)));
  const matching = $derived(selectEvents(doc, activeView, { query, order, filters, from, to }));
  let limit = $state(40);
  let expanded = $state<Record<string, boolean>>({});
  let activeRail = $state('');
  let reduced = $state(false);
  let stops = $state<string[]>([]);
  let years = $state<{ label: string; y: number }[]>([]);
  $effect(() => {
    // Changes to the selection reset history disclosure, while detail expansion is stable by ID.
    void query;
    void view;
    void order;
    void from;
    void to;
    void filters;
    void pageSize;
    limit = pageSize;
    activeRail = '';
  });
  $effect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reduced = media.matches;
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });
  const filtered = $derived(
    activeRail
      ? matching.filter((event) => railFor(event, doc, activeView, rails)?.id === activeRail)
      : matching,
  );
  const visible = $derived(filtered.slice(0, Math.max(1, limit)));
  const allExpanded = $derived(visible.length > 0 && visible.every((x) => expanded[x.id]));
  function toggle(id: string) {
    expanded = { ...expanded, [id]: !expanded[id] };
  }
  function toggleAll() {
    expanded = { ...expanded, ...Object.fromEntries(visible.map((x) => [x.id, !allExpanded])) };
  }
  function fold(node: HTMLElement): TransitionConfig {
    if (reduced) return { duration: 0 };
    const height = node.getBoundingClientRect().height;
    return {
      duration: 360,
      css: (t) => `height:${height * cubicInOut(t)}px;opacity:${t * t};overflow:hidden;`,
    };
  }
  function measure(data: { stops: string[]; years: { label: string; y: number }[] }) {
    stops = data.stops;
    years = data.years;
  }
</script>

<section class="threadline" class:compact={density === 'compact'} aria-label={doc.title}>
  <div class="controls">
    <div class="views" aria-label="Timeline view">
      {#each doc.views as option}<button
          class:chosen={activeView.id === option.id}
          aria-pressed={activeView.id === option.id}
          onclick={() => (view = option.id)}>{option.label}</button
        >{/each}
    </div>
    <label class="search"
      ><span class="sr">Search timeline</span><span aria-hidden="true">⌕</span><input
        type="search"
        placeholder="Search events, tags, attributes…"
        bind:value={query}
      /></label
    >
  </div>
  <div class="legend" aria-label="Filter by rail">
    {#each rails as rail}<button
        class:muted={activeRail && activeRail !== rail.id}
        aria-pressed={activeRail === rail.id}
        onclick={() => {
          activeRail = activeRail === rail.id ? '' : rail.id;
          limit = pageSize;
        }}><i style:background={rail.color}></i>{rail.label}</button
      >{/each}
    {#if activeRail}<button onclick={() => (activeRail = '')}>Clear rail filter ×</button>{/if}
  </div>
  <div class="tools">
    <span aria-live="polite"
      >{filtered.length.toLocaleString()}
      {filtered.length === 1 ? 'event' : 'events'}
      <span class="subtle">· {visible.length.toLocaleString()} shown</span></span
    >
    <div>
      <label
        ><span class="sr">Chronological order</span><select bind:value={order}
          ><option value="asc">Oldest first</option><option value="desc">Newest first</option
          ></select
        ></label
      ><button aria-pressed={guides} onclick={() => (guides = !guides)}
        >Guides {guides ? 'on' : 'off'}</button
      ><button onclick={toggleAll}>{allExpanded ? 'Collapse' : 'Expand'} details</button>
    </div>
  </div>
  <div
    class="timeline"
    class:guides
    style={`--rail-count:${rails.length};--rail-step:${rails.length > 5 ? 13 : 18}px`}
    use:geometry={{ enabled: activeView.mode === 'unified' || guides, onmeasure: measure }}
  >
    <div class="rails" aria-hidden="true">
      {#each rails as rail, i}<i
          class:quiet={activeView.mode === 'unified'}
          style={`--station:${activeView.mode === 'unified' ? (rails.length - 1) / 2 : i};background:${rail.color}`}
        ></i>{/each}
      <i
        class="thread"
        class:quiet={activeView.mode !== 'unified'}
        style={`--station:${(rails.length - 1) / 2};background:${stops.length ? `linear-gradient(to bottom, ${stops.join(',')})` : (rails[0]?.color ?? '#777777')}`}
      ></i>
    </div>
    {#if guides}<div class="year-guides" aria-hidden="true">
        {#each years as year}<span style:top={`${year.y}px`}>{year.label}</span>{/each}
      </div>{/if}
    <div class="rows">
      {#each visible as event, i (event.id)}
        {@const rail = railFor(event, doc, activeView, rails)}
        {@const year = event.date.start?.slice(0, 4) ?? 'Undated'}
        {@const facet = valueFor(
          event,
          doc.dimensions.find((x) => x.id === activeView.dimension)!,
          activeView.depth,
        )}
        <div
          class="row"
          data-threadline-row
          data-year={year}
          style={`--event-color:${facet?.color ?? rail?.color ?? '#777777'};--station:${
            activeView.mode === 'unified'
              ? (rails.length - 1) / 2
              : Math.max(
                  0,
                  rails.findIndex((x) => x.id === rail?.id),
                )
          }`}
          animate:flip={{ duration: reduced ? 0 : 380 }}
          transition:fold
        >
          {#if i === 0 || year !== (visible[i - 1].date.start?.slice(0, 4) ?? 'Undated')}<h3
              class="year"
            >
              {year}<span> / </span>
            </h3>{/if}
          <article class="event">
            <div class="connector" aria-hidden="true"><span data-threadline-dot></span></div>
            {#if item}{@render item(event, {
                expanded: !!expanded[event.id],
                toggle: () => toggle(event.id),
              })}{:else}
              <div class="meta">
                <span class="event-number">{String(i + 1).padStart(2, '0')}</span><span
                  >{facet?.label ?? rail?.label}</span
                ><time datetime={event.date.start ?? undefined}>{formatDate(event)}</time
                >{#if event.featured}<span class="featured">Milestone</span>{/if}
              </div>
              <h4>
                {#if onselect}<button class="title" onclick={() => onselect?.(event)}
                    >{event.title}<span aria-hidden="true"> ↗</span></button
                  >{:else}{event.title}{/if}
              </h4>
              <p class="summary">{event.summary}</p>
              {#if density !== 'compact'}<div class="tags">
                  {#each event.tags.slice(0, 4) as tag}<span>{tag}</span>{/each}
                </div>{/if}
              <button
                class="details-toggle"
                aria-expanded={!!expanded[event.id]}
                onclick={() => toggle(event.id)}
                >{expanded[event.id] ? 'Close' : 'Explore'} details
                <span aria-hidden="true">{expanded[event.id] ? '−' : '+'}</span></button
              >
              {#if expanded[event.id]}<div class="details" transition:fold>
                  {#if details}{@render details(event)}{:else}<dl>
                      {#each Object.entries(event.attributes) as [key, value]}<div>
                          <dt>{doc.dimensions.find((x) => x.id === key)?.label ?? key}</dt>
                          <dd>
                            {(Array.isArray(value) ? value : [value])
                              .map(
                                (id) =>
                                  doc.dimensions
                                    .find((x) => x.id === key)
                                    ?.values.find((x) => x.id === id)?.label ?? id,
                              )
                              .join(', ')}
                          </dd>
                        </div>{/each}
                    </dl>{/if}
                  <div class="sources">
                    {#each event.sources as source}<a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer">{source.label} ↗</a
                      >{/each}
                  </div>
                </div>{/if}
            {/if}
          </article>
        </div>
      {:else}<div class="empty">
          <h3>No events in this view.</h3>
          <p>Try another year range, rail, or search.</p>
          {#if query}<button onclick={() => (query = '')}>Clear search</button>{/if}
        </div>{/each}
    </div>
  </div>
  {#if visible.length < filtered.length}
    <div class="archive">
      <div class="archive-preview" aria-hidden="true">
        <span>{filtered[visible.length].date.start?.slice(0, 4) ?? 'Undated'}</span><strong
          >{filtered[visible.length].title}</strong
        >
        <p>{filtered[visible.length].summary}</p>
      </div>
      <button onclick={() => (limit += pageSize)}
        >Continue the thread <span aria-hidden="true">↓</span></button
      >
      <p>
        {(filtered.length - visible.length).toLocaleString()} more events · next {Math.min(
          pageSize,
          filtered.length - visible.length,
        )}
      </p>
    </div>
  {:else if visible.length}<div class="end">
      <span>↓</span>
      <p>{order === 'asc' ? 'The story continues.' : 'Every story begins somewhere.'}</p>
    </div>{/if}
</section>

<style>
  .threadline {
    color: var(--tl-ink, #282d2c);
    font-family: inherit;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  button,
  input,
  select {
    font: inherit;
    color: inherit;
  }
  button {
    cursor: pointer;
    background: none;
    border: 0;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--tl-accent, #476e5e);
    outline-offset: 4px;
  }
  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    border-bottom: 1px solid var(--tl-border, #d8dcd4);
    padding-bottom: 18px;
  }
  .views {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .views button {
    padding: 10px 15px;
    border-radius: 5px;
    font-size: 13px;
  }
  .views .chosen {
    background: var(--tl-ink, #282d2c);
    color: var(--tl-paper, #f4f2ec);
  }
  .search {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .search > span[aria-hidden] {
    font-size: 25px;
  }
  .search input {
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--tl-border, #d8dcd4);
    padding: 8px 0;
    width: 250px;
    font-size: 12px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 18px 0 22px;
  }
  .legend button {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    padding: 3px 0;
  }
  .legend i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .legend .muted {
    opacity: 0.35;
  }
  .tools {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 11px;
    color: var(--tl-muted, #737873);
    padding: 12px 0 25px;
  }
  .tools > div {
    display: flex;
    gap: 15px;
  }
  .tools select {
    background: none;
    border: 0;
    font-size: 11px;
    cursor: pointer;
  }
  .subtle {
    opacity: 0.7;
  }
  .timeline {
    position: relative;
    padding-left: calc(58px + var(--rail-count) * var(--rail-step));
  }
  .rails {
    position: absolute;
    left: 18px;
    top: 34px;
    bottom: 20px;
  }
  .rails i {
    position: absolute;
    left: calc(var(--station) * var(--rail-step));
    width: 2px;
    top: 0;
    bottom: 0;
    opacity: 0.6;
    transition:
      left 0.4s,
      opacity 0.3s;
  }
  .rails i.quiet {
    opacity: 0;
  }
  .rails .thread {
    transition: opacity 0.3s;
  }
  .row {
    position: relative;
  }
  .year {
    margin: 0;
    padding: 20px 0 12px;
    font:
      500 12px ui-monospace,
      monospace;
    letter-spacing: 1px;
  }
  .year > span {
    color: var(--tl-border, #d8dcd4);
  }
  .event {
    position: relative;
    padding: 22px 0 27px;
    border-bottom: 1px solid var(--tl-border, #d8dcd4);
  }
  .connector {
    position: absolute;
    left: calc(-40px - var(--rail-count) * var(--rail-step) + var(--station) * var(--rail-step));
    width: calc(22px + var(--rail-count) * var(--rail-step) - var(--station) * var(--rail-step));
    height: 2px;
    top: 31px;
    background: var(--event-color);
    transition:
      left 0.4s,
      width 0.4s,
      background 0.4s;
    box-shadow:
      0 -3px var(--tl-paper, #f4f2ec),
      0 3px var(--tl-paper, #f4f2ec);
  }
  .connector span {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    top: -4px;
    left: -4px;
    background: var(--event-color);
    box-shadow: 0 0 0 4px var(--tl-paper, #f4f2ec);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 10px;
    color: var(--tl-muted, #737873);
  }
  .meta > span:nth-child(2) {
    color: var(--event-color);
  }
  .event-number {
    font:
      9px ui-monospace,
      monospace;
    opacity: 0.6;
  }
  .meta time {
    margin-left: auto;
  }
  .featured {
    font:
      9px ui-monospace,
      monospace;
    border: 1px solid var(--tl-border, #d8dcd4);
    padding: 3px 6px;
    border-radius: 2px;
  }
  h4 {
    font-weight: 500;
    font-size: 23px;
    letter-spacing: -0.6px;
    margin: 13px 0 8px;
  }
  .title {
    padding: 0;
    text-align: left;
    font: inherit;
    letter-spacing: inherit;
  }
  .title > span {
    font-size: 16px;
    color: var(--tl-muted, #737873);
  }
  .summary {
    color: var(--tl-muted, #737873);
    font-size: 13px;
    line-height: 1.65;
    margin: 0;
    max-width: 650px;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 14px 0 0;
  }
  .tags span {
    font-size: 10px;
    padding: 4px 8px;
    border: 1px solid var(--tl-border, #d8dcd4);
    border-radius: 3px;
    color: var(--tl-muted, #737873);
  }
  .details-toggle {
    color: var(--tl-accent, #476e5e);
    font-size: 11px;
    padding: 14px 0 0;
  }
  .details-toggle > span {
    margin-left: 12px;
  }
  .details {
    margin-top: 18px;
    font-size: 12px;
  }
  dl {
    margin: 0;
  }
  dl > div {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 16px;
    padding: 7px 0;
  }
  dt {
    color: var(--tl-muted, #737873);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .sources {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    margin: 16px 0;
  }
  .sources a {
    color: var(--tl-accent, #476e5e);
    font-size: 11px;
  }
  .year-guides {
    position: absolute;
    left: -25px;
    top: 0;
  }
  .year-guides span {
    position: absolute;
    writing-mode: vertical-rl;
    transform: translateY(-50%) rotate(180deg);
    font:
      10px ui-monospace,
      monospace;
    color: var(--tl-muted, #737873);
  }
  .guides .event::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 31px;
    border-top: 1px dashed var(--tl-border, #d8dcd4);
    opacity: 0.35;
    pointer-events: none;
  }
  .empty {
    padding: 45px 0;
  }
  .empty h3 {
    font-size: 20px;
  }
  .empty p {
    font-size: 13px;
    color: var(--tl-muted, #737873);
  }
  .empty button {
    color: var(--tl-accent, #476e5e);
    padding: 0;
  }
  .archive {
    margin: 16px 0 0;
    padding-left: calc(58px + var(--rail-count, 4) * 18px);
  }
  .archive-preview {
    height: 110px;
    overflow: hidden;
    mask-image: linear-gradient(black, transparent);
    pointer-events: none;
  }
  .archive-preview > span {
    font:
      11px ui-monospace,
      monospace;
    display: block;
    margin: 20px 0;
  }
  .archive-preview strong {
    font-weight: 500;
    font-size: 20px;
  }
  .archive-preview p {
    font-size: 13px;
  }
  .archive > button {
    margin-top: 5px;
    padding: 10px 0;
    font-size: 13px;
    color: var(--tl-accent, #476e5e);
  }
  .archive > button span {
    padding-left: 18px;
  }
  .archive > p {
    color: var(--tl-muted, #737873);
    font-size: 11px;
  }
  .end {
    margin: 35px 0 15px;
    text-align: center;
    color: var(--tl-muted, #737873);
  }
  .end p {
    font-size: 12px;
  }
  .compact .event {
    padding-bottom: 18px;
  }
  .compact h4 {
    font-size: 18px;
  }
  .compact .summary {
    font-size: 12px;
  }
  .compact .details-toggle {
    padding-top: 8px;
  }
  @media (max-width: 700px) {
    .controls {
      align-items: stretch;
      flex-direction: column;
      gap: 12px;
    }
    .search input {
      width: 100%;
    }
    .search {
      width: 100%;
    }
    .views button {
      padding: 9px 12px;
    }
    .timeline {
      --rail-step: 11px !important;
      padding-left: calc(36px + var(--rail-count) * var(--rail-step));
    }
    .connector {
      left: calc(-18px - var(--rail-count) * var(--rail-step) + var(--station) * var(--rail-step));
      width: calc(7px + var(--rail-count) * var(--rail-step) - var(--station) * var(--rail-step));
    }
    .rails {
      left: 18px;
    }
    .tools {
      flex-wrap: wrap;
      gap: 16px;
    }
    .tools > div {
      gap: 12px;
    }
    .featured,
    .event-number {
      display: none;
    }
    .meta {
      font-size: 9px;
      gap: 6px;
    }
    h4 {
      font-size: 20px;
    }
    .archive {
      padding-left: 60px;
    }
    .year-guides {
      left: 0;
    }
    dl > div {
      grid-template-columns: 110px 1fr;
      gap: 10px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .rails i,
    .connector {
      transition: none;
    }
  }
</style>
