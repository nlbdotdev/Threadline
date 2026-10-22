<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Threadline,
    parseDocument,
    selectEvents,
    formatDate,
    type ThreadlineDocument,
    type TimelineEvent,
  } from './lib';
  import Documentation from './Documentation.svelte';
  import GitHistory from './GitHistory.svelte';
  type Provenance = {
    eventCount: number;
    highlightCount: number;
    matchedHumanFlights: number;
    crewCoverageThrough: string;
    sourceUpdates: Record<string, string>;
    attribution: string;
    sourceUrls: Record<string, string>;
  };
  let doc = $state<ThreadlineDocument | null>(null);
  let provenance = $state<Provenance | null>(null);
  let error = $state('');
  let page = $state('explorer');
  let view = $state('highlights');
  let query = $state('');
  let order = $state<'asc' | 'desc'>('asc');
  let country = $state('');
  let organization = $state('');
  let crew = $state('');
  let outcome = $state('');
  let from = $state('');
  let to = $state('');
  let density = $state<'comfortable' | 'compact'>('comfortable');
  let selected = $state<TimelineEvent | null>(null);
  let dialog: HTMLDialogElement;
  const filters = $derived({ country, organization, crew, outcome });
  const counts = $derived(
    doc
      ? selectEvents(
          doc,
          { ...doc.views[0], featuredOnly: false },
          { query, order, filters, from, to },
        )
      : [],
  );
  const decades = $derived(
    doc
      ? Array.from({ length: 8 }, (_, i) => {
          const year = 1950 + i * 10;
          return {
            year,
            count: doc!.events.filter(
              (x) =>
                Number(x.date.start?.slice(0, 4)) >= year &&
                Number(x.date.start?.slice(0, 4)) < year + 10,
            ).length,
          };
        })
      : [],
  );
  const peak = $derived(Math.max(1, ...decades.map((x) => x.count)));
  const viewName = $derived(doc?.views.find((x) => x.id === view)?.label ?? 'Highlights');
  onMount(() => {
    const params = new URLSearchParams(location.search);
    const requestedPage = params.get('page');
    if (requestedPage && ['docs', 'data', 'roadmap'].includes(requestedPage)) page = requestedPage;
    else if (params.get('example') === 'git') page = 'git';
    view = params.get('view') ?? 'highlights';
    query = params.get('q') ?? '';
    country = params.get('country') ?? '';
    organization = params.get('organization') ?? '';
    crew = params.get('crew') ?? '';
    outcome = params.get('outcome') ?? '';
    from = params.get('from') ?? '';
    to = params.get('to') ?? '';
    order = params.get('order') === 'desc' ? 'desc' : 'asc';
    const load = async () => {
      try {
        const responses = await Promise.all([
          fetch('/data/spaceflight.json'),
          fetch('/data/provenance.json'),
        ]);
        if (responses.some((x) => !x.ok)) throw new Error('Could not load the spaceflight data.');
        const data = await Promise.all(responses.map((x) => x.json()));
        doc = parseDocument(data[0]);
        provenance = data[1];
        if (!doc.views.some((x) => x.id === view)) view = doc.views[0].id;
        for (const [key, value] of Object.entries(filters))
          if (
            value &&
            !doc.dimensions.find((x) => x.id === key)?.values.some((x) => x.id === value)
          ) {
            if (key === 'country') country = '';
            if (key === 'organization') organization = '';
            if (key === 'crew') crew = '';
            if (key === 'outcome') outcome = '';
          }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
    };
    void load();
  });
  $effect(() => {
    if (!doc) return;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      view,
      q: query,
      country,
      organization,
      crew,
      outcome,
      from,
      to,
      order,
      example: page === 'git' ? 'git' : '',
      page: ['docs', 'data', 'roadmap'].includes(page) ? page : '',
    }))
      if (value) params.set(key, value);
    history.replaceState(null, '', `${location.pathname}?${params}`);
  });
  $effect(() => {
    if (selected && dialog && !dialog.open) dialog.showModal();
  });
  function reset() {
    country = '';
    organization = '';
    crew = '';
    outcome = '';
    from = '';
    to = '';
    query = '';
  }
  function label(event: TimelineEvent, key: string) {
    const value = event.attributes[key];
    return (Array.isArray(value) ? value : [value])
      .map(
        (id) =>
          doc?.dimensions
            .find((dimension) => dimension.id === key)
            ?.values.find((value) => value.id === id)?.label ?? id,
      )
      .join(' / ');
  }
  const examples = [
    {
      id: 'first',
      title: 'First satellites',
      note: '1957–1960 · by country',
      view: 'countries',
      from: '1957',
      to: '1960',
    },
    {
      id: 'crewed',
      title: 'The Moon race',
      note: '1961–1972 · crewed launches',
      view: 'countries',
      from: '1961',
      to: '1972',
      crew: 'crewed',
    },
    {
      id: 'spacex',
      title: 'SpaceX launches',
      note: '2006–2026 · by outcome',
      view: 'outcomes',
      from: '2006',
      to: '2026',
      organization: 'SPX',
    },
    {
      id: 'failures',
      title: 'Launch failures',
      note: 'All years · by country',
      view: 'countries',
      outcome: 'failure',
    },
  ];
  function explore(example: (typeof examples)[number]) {
    reset();
    view = example.view;
    from = example.from ?? '';
    to = example.to ?? '';
    crew = example.crew ?? '';
    organization = example.organization ?? '';
    outcome = example.outcome ?? '';
    order = 'asc';
  }
  function period(year: number) {
    from = String(year);
    to = String(year + 9);
    if (view === 'highlights') view = 'everything';
  }
</script>

<svelte:head
  ><title
    >Threadline Lab — {page === 'explorer'
      ? 'Spaceflight'
      : page === 'git'
        ? 'Git history'
        : page === 'docs'
          ? 'Component docs'
          : page === 'data'
            ? 'Data & sources'
            : 'Roadmap'}</title
  ></svelte:head
>
<div class="shell">
  <header>
    <button class="brand" onclick={() => (page = 'explorer')} aria-label="Threadline Lab home"
      ><svg viewBox="0 0 32 32" aria-hidden="true"
        ><path
          d="M8 3v10q0 4 8 4t8 4v8M16 3v26M24 3v10q0 4-8 4t-8 4v8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        /><circle cx="16" cy="17" r="3" fill="currentColor" /></svg
      ><span>Threadline<span class="lab"> / Lab</span></span></button
    >
    <nav aria-label="Main navigation">
      {#each [{ id: 'explorer', label: 'Spaceflight' }, { id: 'git', label: 'Git history' }, { id: 'docs', label: 'Component' }, { id: 'data', label: 'Data & sources' }, { id: 'roadmap', label: 'Roadmap' }] as tab}<button
          class:active={page === tab.id}
          aria-current={page === tab.id ? 'page' : undefined}
          onclick={() => (page = tab.id)}>{tab.label}</button
        >{/each}
    </nav>
    <a class="version" href="https://github.com/nlbdotdev/Threadline">GitHub ↗</a>
  </header>
  <main>
    {#if page === 'explorer'}
      <section class="hero">
        <div>
          <p class="eyebrow">Example 01 <span> / </span> Spaceflight</p>
          <h1>Spaceflight,<br />launch by launch.</h1>
          <p class="intro">
            Browse {doc?.events.length.toLocaleString() ?? '…'} orbital and deep-space launch attempts.
            Compare countries, launch providers, crew status, and outcomes using the same timeline.
          </p>
          <div class="hero-note">
            <span class="dot"></span>Orbital & deep-space attempts<span>1957 → 2026</span>
          </div>
        </div>
        <div class="orbit" aria-hidden="true">
          <svg viewBox="0 0 300 260"
            ><defs
              ><linearGradient id="orbit-color"
                ><stop stop-color="#476e5e" /><stop offset=".5" stop-color="#b97345" /><stop
                  offset="1"
                  stop-color="#6486a5"
                /></linearGradient
              ></defs
            ><circle cx="150" cy="130" r="72" fill="none" stroke="#d2d8cd" /><circle
              cx="150"
              cy="130"
              r="107"
              fill="none"
              stroke="#d2d8cd"
              stroke-dasharray="2 6"
            /><path
              d="M25 185C40 15 284 4 274 141S68 262 63 165 232 41 237 137 119 205 105 141 169 93 191 129"
              fill="none"
              stroke="url(#orbit-color)"
              stroke-width="1.6"
            /><circle cx="25" cy="185" r="4" fill="#476e5e" /><circle
              cx="274"
              cy="141"
              r="4"
              fill="#b97345"
            /><circle cx="191" cy="129" r="4" fill="#6486a5" /><path
              d="M150 106v48M126 130h48"
              stroke="#afbbaa"
              stroke-width=".7"
            /><circle cx="150" cy="130" r="3" fill="#476e5e" /><text x="218" y="32">CHRONOLOGY</text
            ><text x="7" y="232">CATEGORY RAILS</text></svg
          ><span>FIG. 001 <span>Timeline layout study</span></span>
        </div>
      </section>
      <div class="stat-strip">
        <div>
          <strong>{doc?.events.length.toLocaleString() ?? '—'}</strong><span>Launch attempts</span>
        </div>
        <div>
          <strong>{provenance?.matchedHumanFlights.toLocaleString() ?? '—'}</strong><span
            >Matched crewed flights</span
          >
        </div>
        <div>
          <strong>{doc?.dimensions[0].values.length ?? '—'}</strong><span>Country categories</span>
        </div>
        <div class="stat-caption">
          GCAT snapshot · {provenance?.sourceUpdates.launch
            ?.split(' ')
            .filter(Boolean)
            .slice(0, 3)
            .join(' ') ?? 'Loading…'}<br />Orbital and deep-space attempts only.
        </div>
      </div>
      {#if error}<div class="error" role="alert">
          {error}<button onclick={() => location.reload()}>Reload</button>
        </div>{:else if !doc}<p class="loading">Loading launches…</p>{:else}
        <section class="explorer-heading">
          <div>
            <p class="eyebrow">Explore launches</p>
            <h2>Launch timeline</h2>
          </div>
          <div class="density">
            <button
              class:active={density === 'comfortable'}
              aria-pressed={density === 'comfortable'}
              onclick={() => (density = 'comfortable')}>Comfortable</button
            ><button
              class:active={density === 'compact'}
              aria-pressed={density === 'compact'}
              onclick={() => (density = 'compact')}>Compact</button
            >
          </div>
        </section>
        <div class="example-starts" aria-label="Suggested spaceflight views">
          {#each examples as example (example.id)}<button onclick={() => explore(example)}>
              <strong>{example.title} <span aria-hidden="true">↗</span></strong>
              <span>{example.note}</span>
            </button>{/each}
        </div>
        <div class="catalog-layout">
          <aside class="filter-sidebar" aria-label="Catalogue filters">
            <p class="eyebrow">Filter launches</p>
            <label
              >Country<select bind:value={country}
                ><option value="">All countries</option
                >{#each doc.dimensions[0].values as value}<option value={value.id}
                    >{value.label}</option
                  >{/each}</select
              ></label
            ><label
              >Organization<select bind:value={organization}
                ><option value="">All organizations</option
                >{#each [...doc.dimensions[1].values].sort( (a, b) => a.label.localeCompare(b.label) ) as value}<option
                    value={value.id}>{value.label}</option
                  >{/each}</select
              ></label
            ><label
              >Crew<select bind:value={crew}
                ><option value="">All crew statuses</option
                >{#each doc.dimensions[2].values as value}<option value={value.id}
                    >{value.label}</option
                  >{/each}</select
              ></label
            ><label
              >Outcome<select bind:value={outcome}
                ><option value="">All outcomes</option
                >{#each doc.dimensions[3].values as value}<option value={value.id}
                    >{value.label}</option
                  >{/each}</select
              ></label
            >
            <div class="year-range">
              <label
                >From<input
                  aria-label="From year"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]{4}"
                  placeholder="1957"
                  maxlength="4"
                  bind:value={from}
                /></label
              ><label
                >Through<input
                  aria-label="Through year"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]{4}"
                  placeholder="2026"
                  maxlength="4"
                  bind:value={to}
                /></label
              >
            </div>
            <button class="reset" onclick={reset}>Reset filters ↺</button>
            <div class="scope-note">
              <span class="dot"></span>
              <p>
                {view === 'highlights'
                  ? `${provenance?.highlightCount} selected milestones. Switch to Everything for the full catalogue.`
                  : `${counts.length.toLocaleString()} launches match these filters before rail selection.`}
              </p>
            </div>
            <p class="small-note">
              Country refers to the launch organization. The launch site is preserved as an
              attribute.
            </p>
          </aside>
          <div class="collection">
            <div class="decade-strip" aria-label="Explore a decade">
              <button
                class:chosen={!from && !to}
                onclick={() => {
                  from = '';
                  to = '';
                }}>All time</button
              >{#each decades as decade}<button
                  class:chosen={from === String(decade.year) && to === String(decade.year + 9)}
                  onclick={() => period(decade.year)}
                  aria-label={`${decade.year}s: ${decade.count} launch attempts`}
                  ><i style:height={`${7 + (decade.count / peak) * 25}px`}></i><span
                    >{decade.year}s</span
                  ></button
                >{/each}
            </div>
            <Threadline
              document={doc}
              bind:view
              bind:query
              bind:order
              {filters}
              from={from || undefined}
              to={to || undefined}
              {density}
              onselect={(event) => (selected = event)}
            >
              {#snippet item(event, state)}
                <div class="launch-meta">
                  <time datetime={event.date.start ?? undefined}>{formatDate(event)}</time>
                  {#if event.featured}<span>Milestone</span>{/if}
                  <span class="launch-outcome" class:failed={event.attributes.outcome === 'failure'}
                    >{label(event, 'outcome')}</span
                  >
                </div>
                <h3 class="launch-title">
                  <button onclick={() => (selected = event)}>{event.title}</button>
                </h3>
                <p class="launch-summary">{event.summary}</p>
                <p class="launch-labels">
                  {label(event, 'country')} · {label(event, 'organization')} · {label(
                    event,
                    'crew',
                  )}
                </p>
                <button class="launch-details" aria-expanded={state.expanded} onclick={state.toggle}
                  >{state.expanded ? 'Hide details −' : 'Show details +'}</button
                >
                {#if state.expanded}<div class="launch-detail">
                    <dl>
                      <div>
                        <dt>Vehicle</dt>
                        <dd>{event.attributes.vehicle}</dd>
                      </div>
                      <div>
                        <dt>Launch site</dt>
                        <dd>{event.attributes.site} · {event.attributes.pad}</dd>
                      </div>
                      <div>
                        <dt>Launch ID</dt>
                        <dd>{event.id}</dd>
                      </div>
                      <div>
                        <dt>Source date</dt>
                        <dd>{event.attributes.sourceDate}</dd>
                      </div>
                    </dl>
                    <button class="launch-details" onclick={() => (selected = event)}
                      >Full source record ↗</button
                    >
                  </div>{/if}
              {/snippet}
            </Threadline>
            <p class="reading-note">
              {viewName} · Chronological, content-spaced layout. Gaps do not measure elapsed time.
            </p>
          </div>
        </div>
      {/if}
    {:else if page === 'git'}<GitHistory />
    {:else if page === 'docs'}<Documentation />
    {:else if page === 'data'}
      <section class="prose-page">
        <p class="eyebrow">Sources & methods</p>
        <h1>Spaceflight data<br />and sources.</h1>
        <p class="intro">
          A fixed snapshot of Jonathan McDowell's launch catalogue. The explorer works without a
          live API.
        </p>
        <div class="downloads">
          <a class="solid" href="/data/spaceflight.json" download>Download Threadline document ↓</a
          ><a href="/data/provenance.json" download>Provenance manifest ↗</a><a
            href="/threadline.schema.json"
            download>JSON Schema ↗</a
          >
        </div>
        <h2>What is in the collection?</h2>
        <p>
          {doc?.description} Dates and organization names are normalized; original launch IDs, source
          dates, launch codes, vehicles, sites, and pads are preserved. The source snapshot contains {doc?.events.length.toLocaleString()}
          events.
        </p>
        <h2>What does “crewed” mean here?</h2>
        <p>
          Recorded human orbital flights are matched to launch attempts by UTC launch time within
          two minutes. Ambiguous or missing joins stop the importer. All {provenance?.matchedHumanFlights}
          eligible human flights matched in this snapshot. Before {provenance?.crewCoverageThrough},
          remaining attempts are labeled uncrewed; on and after that cutoff, unmatched attempts are
          unknown. This relies on the human-flight catalogue's coverage; the join is not independent
          proof that every other launch was uncrewed.
        </p>
        <h2>Countries, agencies, and providers</h2>
        <p>
          Country is the source launch organization's StateCode, preserved as supplied by GCAT.
          Joint operator codes are resolved from their members; multiple countries remain multiple
          values. It is not the payload owner's country or the site's country. “Organization” is
          GCAT's entity responsible for launch services, which may be an agency, military body,
          launch center, or company. Branches uses the table's parent relationships. Payload agency
          attribution is a future enrichment.
        </p>
        <h2>What does success mean?</h2>
        <p>
          Launch outcome describes the source rocket's propulsive result. Codes containing a
          numerical success fraction are grouped as Partial. A successful launch can still carry a
          mission that later fails. Outcome does not describe the complete mission.
        </p>
        <h2>Snapshot & attribution</h2>
        {#if provenance}<dl class="source-list">
            {#each Object.entries(provenance.sourceUpdates) as [key, value]}<div>
                <dt>{key}</dt>
                <dd>
                  {value}<a href={provenance.sourceUrls[key]} target="_blank" rel="noreferrer"
                    >Source ↗</a
                  >
                </dd>
              </div>{/each}
          </dl>
          <p>{provenance.attribution}</p>{/if}
        <p>
          GCAT data is licensed <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a
          >. Normalization, highlighted titles, classification, and view definitions are changes
          made for Threadline Lab. Source hashes and retrieval time are available in the manifest.
        </p>
        <h2>Update the snapshot</h2>
        <pre><code
            >npm run data:import
npm run check
npm test
npm run build</code
          ></pre>
        <p>Refreshing is explicit. Opening the Lab and running a build never contacts GCAT.</p>
      </section>
    {:else}
      <section class="prose-page">
        <p class="eyebrow">Development status</p>
        <h1>What works.<br />What comes next.</h1>
        <p class="intro">
          The Svelte component and JSON format work today. These are the remaining improvements and
          planned adapters.
        </p>
        <div class="roadmap-grid">
          {#each [{ no: '01', status: 'Available · v0.1', title: 'Svelte & documentation', body: 'A packaged Svelte 5 renderer, framework-neutral TypeScript core, versioned JSON model, live playground, and launch-history experiment.' }, { no: '02', status: 'Next', title: 'Component improvements', body: 'More precise organization mapping, media adapters, URL integrations, controlled detail state, archive scroll reveal, stable focus behavior, and package consumer testing.' }, { no: '03', status: 'Planned', title: 'React & Vue', body: 'Native React and Vue renderers using the same schema, selectors, and behavioral contract. Svelte remains the reference implementation; framework adapters get shared conformance fixtures.' }, { no: '04', status: 'Planned', title: 'Date and rendering support', body: 'Proportional time, intervals, BCE dates, uncertainty ranges, dense-data virtualization, and explicit relationship markers.' }, { no: '05', status: 'Future experiments', title: 'Beyond spaceflight', body: 'Mathematical discoveries for uncertain dates and contested attribution. American history for overlapping themes. Scientific discoveries for independent and simultaneous work.' }] as entry}<article
            >
              <span class="eyebrow">{entry.no} / {entry.status}</span>
              <h2>{entry.title}</h2>
              <p>{entry.body}</p>
            </article>{/each}
        </div>
        <p>
          The Lab is publicly hosted. The npm package has not been published. No React or Vue
          adapter is shipped yet.
        </p>
      </section>
    {/if}
  </main>
  <footer>
    <span>Threadline / Lab <span>© 2026 Nathan Bennett</span></span>
    <a href="https://github.com/nlbdotdev/Threadline/blob/main/LICENSE">MIT license</a><a
      href="https://planet4589.org/space/gcat/"
      target="_blank"
      rel="noreferrer">Data from GCAT · J. McDowell ↗</a
    ><button onclick={() => (page = 'docs')}>Built with Threadline · Svelte 5 ↗</button>
  </footer>
</div>
<dialog
  bind:this={dialog}
  onclose={() => (selected = null)}
  onclick={(event) => {
    if (event.target === dialog) dialog.close();
  }}
  onkeydown={(event) => {
    if (event.key === 'Escape') dialog.close();
  }}
  aria-label={selected?.title ?? 'Launch details'}
>
  {#if selected && doc}<div class="dialog-content">
      <button class="dialog-close" onclick={() => dialog.close()}>Close ×</button>
      <p class="eyebrow">Launch {selected.id} / {formatDate(selected)}</p>
      <h2>{selected.title}</h2>
      <p>{selected.summary}</p>
      <dl class="source-list">
        {#each Object.entries(selected.attributes) as [key, value]}<div>
            <dt>{doc.dimensions.find((x) => x.id === key)?.label ?? key}</dt>
            <dd>
              {(Array.isArray(value) ? value : [value])
                .map(
                  (id) =>
                    doc?.dimensions.find((x) => x.id === key)?.values.find((x) => x.id === id)
                      ?.label ?? id,
                )
                .join(', ')}
            </dd>
          </div>{/each}
      </dl>
      <div class="downloads">
        {#each selected.sources as source}<a href={source.url} target="_blank" rel="noreferrer"
            >{source.label} ↗</a
          >{/each}
      </div>
    </div>{/if}
</dialog>
