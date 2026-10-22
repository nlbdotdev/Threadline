<script lang="ts">
  import { onMount } from 'svelte';
  import { Threadline, parseDocument, formatDate, type ThreadlineDocument } from './lib';
  let doc = $state<ThreadlineDocument | null>(null);
  let error = $state('');
  let view = $state('areas');
  let query = $state('');
  let order = $state<'asc' | 'desc'>('desc');
  let area = $state('');
  const filters = $derived({ area });
  const roots = $derived(doc?.dimensions[0].values.filter((value) => !value.parent) ?? []);
  const repository = $derived(doc?.events[0]?.attributes.repository ?? 'Threadline');
  const owner = $derived(
    doc?.events[0]?.sources[0]
      ? new URL(doc.events[0].sources[0].url).pathname.split('/')[1]
      : 'Local repository',
  );
  const labels = (value: string | string[]) =>
    (Array.isArray(value) ? value : [value]).map(
      (id) => doc?.dimensions[0].values.find((x) => x.id === id)?.label ?? id,
    );
  onMount(async () => {
    try {
      const response = await fetch('/data/git-history.json');
      if (!response.ok) throw new Error('Could not load the commit-history snapshot.');
      doc = parseDocument(await response.json());
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });
</script>

<section class="git-example">
  <p class="eyebrow">Experiment 002 / Real Git history</p>
  <div class="heading">
    <div>
      <h1>
        A repository.<br />{doc?.events.length === 12 ? 'A dozen' : 'A few'} <em>chapters.</em>
      </h1>
      <p class="intro">
        A tight slice of {repository}, read through the projects it touches.<br />Collapse the work
        into one thread, then unfold it into areas or projects.
      </p>
    </div>
    <div class="repo-stamp">
      <span>{owner} /</span><strong>{repository}</strong><span
        >{doc?.events.length ?? '—'} commits · first-parent history</span
      >
    </div>
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{:else if !doc}<p class="loading">
      Reading the commit collection…
    </p>{:else}
    <div class="context">
      <p>{doc.description}</p>
      <a href="/data/git-history.json" download>Document ↓</a><a
        href="/data/git-provenance.json"
        download>Provenance ↗</a
      >
    </div>
    <div class="area-filter">
      <label
        >Show changes touching <select bind:value={area}
          ><option value="">Any area</option>{#each roots as root}<option value={root.id}
              >{root.label}</option
            >{/each}</select
        ></label
      >
      <p>A commit can touch several areas. This filter matches all of them.</p>
    </div>
    <div class="git-timeline">
      <Threadline
        document={doc}
        bind:view
        bind:query
        bind:order
        {filters}
        pageSize={12}
        maxRails={7}
        density="compact"
      >
        {#snippet item(event, state)}
          <div class="commit-meta">
            <code>{event.id.slice(0, 8)}</code><span
              >{event.attributes.change === 'merge' ? 'Merge' : 'Commit'}</span
            ><time datetime={event.date.start ?? undefined}>{formatDate(event)}</time>
          </div>
          <h2 class="commit-title">{event.title}</h2>
          <p class="commit-summary">{event.summary}</p>
          <div class="commit-areas">
            {#each labels(event.attributes.area) as label}<span>{label}</span>{/each}
          </div>
          <div class="commit-actions">
            <button aria-expanded={state.expanded} onclick={state.toggle}
              >{state.expanded ? 'Hide' : 'Show'} changes {state.expanded ? '−' : '+'}</button
            >{#each event.sources as source}<a href={source.url} target="_blank" rel="noreferrer"
                >{source.label} ↗</a
              >{/each}
          </div>
          {#if state.expanded}<div class="commit-detail">
              <dl>
                <dt>Commit</dt>
                <dd><code>{event.id}</code></dd>
                <dt>Parents</dt>
                <dd>
                  {#each Array.isArray(event.attributes.parents) ? event.attributes.parents : [event.attributes.parents] as parent}<code
                      >{parent.slice(0, 12)}</code
                    >{:else}Root commit{/each}
                </dd>
                <dt>Source time</dt>
                <dd>{event.attributes.sourceCommitterTime}</dd>
              </dl>
              <p>
                First {Math.min(8, Number(event.attributes.filesChanged))} of {event.attributes
                  .filesChanged} changed paths{event.attributes.change === 'merge'
                  ? ' · relative to first parent'
                  : ''}
              </p>
              <ul>
                {#each Array.isArray(event.attributes.pathPreview) ? event.attributes.pathPreview : [event.attributes.pathPreview] as path}<li
                  >
                    <code>{path}</code>
                  </li>{/each}
              </ul>
            </div>{/if}
        {/snippet}
      </Threadline>
    </div>
    <p class="reading-note">
      Rails show touched areas, not branches or ancestry. Multi-area commits appear once on their
      primary area; tags preserve the rest. Display order uses committer time, which can differ from
      Git topology.
    </p>
    <div class="git-recipe">
      <h2>Use another repository</h2>
      <p>
        The adapter reads local Git metadata and emits the same Threadline document used by the
        Svelte component.
      </p>
      <pre><code
          >npm run data:git -- --repo /path/to/repo --ref HEAD --limit 12
# Optional links: --url https://github.com/owner/repo</code
        ></pre>
    </div>
  {/if}
</section>

<style>
  .git-example {
    padding-top: 48px;
  }
  .heading {
    display: flex;
    justify-content: space-between;
    gap: 35px;
    align-items: center;
  }
  .heading h1 {
    font-size: 54px;
  }
  .repo-stamp {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 26px 35px;
    border-left: 1px solid var(--border);
    min-width: 240px;
  }
  .repo-stamp span {
    font:
      10px ui-monospace,
      monospace;
    color: var(--muted);
  }
  .repo-stamp strong {
    font:
      32px Georgia,
      serif;
  }
  .context {
    display: flex;
    align-items: center;
    gap: 20px;
    margin: 30px 0 0;
    padding: 18px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .context p {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.7;
    margin: 0;
    flex: 1;
  }
  .context a {
    font-size: 10px;
    text-decoration: none;
    white-space: nowrap;
  }
  .area-filter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 20px 0 25px;
    font-size: 11px;
    color: var(--muted);
  }
  .area-filter select {
    background: var(--paper);
    border: 1px solid var(--border);
    padding: 7px;
    margin-left: 10px;
    border-radius: 3px;
    font-size: 11px;
  }
  .area-filter p {
    font-size: 10px;
  }
  .git-timeline {
    max-width: 940px;
    margin: 0 auto;
  }
  .commit-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 10px;
    color: var(--muted);
  }
  .commit-meta code {
    color: var(--accent);
    font-size: 10px;
  }
  .commit-meta time {
    margin-left: auto;
    font-size: 10px;
  }
  .commit-title {
    font:
      500 19px/1.4 Arial,
      Helvetica,
      sans-serif;
    letter-spacing: -0.3px;
    margin: 11px 0 7px;
  }
  .commit-summary {
    font:
      11px ui-monospace,
      monospace;
    color: var(--muted);
    margin: 0 0 12px;
  }
  .commit-areas {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .commit-areas span {
    font-size: 9px;
    color: var(--muted);
    border: 1px solid var(--border);
    padding: 3px 7px;
    border-radius: 3px;
  }
  .commit-actions {
    display: flex;
    gap: 20px;
    margin-top: 12px;
    align-items: center;
  }
  .commit-actions button,
  .commit-actions a {
    font-size: 10px;
    color: var(--accent);
    padding: 0;
    text-decoration: none;
  }
  .commit-detail {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--muted);
  }
  .commit-detail dl {
    display: grid;
    grid-template-columns: 85px minmax(0, 1fr);
    gap: 10px;
    margin: 0;
  }
  .commit-detail dd {
    margin: 0;
    overflow-wrap: anywhere;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .commit-detail code {
    font-size: 10px;
    overflow-wrap: anywhere;
  }
  .commit-detail ul {
    padding-left: 14px;
    margin: 10px 0;
  }
  .commit-detail li {
    padding: 4px 0;
  }
  .commit-detail p {
    font-size: 10px;
    margin: 20px 0 6px;
  }
  .git-recipe {
    border-top: 1px solid var(--border);
    padding-top: 10px;
    max-width: 940px;
    margin: 30px auto 0;
  }
  .git-recipe h2 {
    font:
      23px Georgia,
      serif;
  }
  .git-recipe p {
    font-size: 12px;
    color: var(--muted);
  }
  @media (max-width: 700px) {
    .git-example {
      padding-top: 32px;
    }
    .heading {
      display: block;
    }
    .heading h1 {
      font-size: 42px;
    }
    .repo-stamp {
      padding: 15px 0;
      gap: 8px;
      border: 0;
      margin-top: 15px;
    }
    .repo-stamp strong {
      font-size: 25px;
    }
    .context {
      flex-wrap: wrap;
      margin-top: 15px;
      gap: 12px;
    }
    .context p {
      flex-basis: 100%;
    }
    .area-filter {
      align-items: flex-start;
      flex-direction: column;
      gap: 5px;
    }
    .area-filter p {
      margin: 5px 0;
    }
    .commit-meta {
      flex-wrap: wrap;
      gap: 7px;
    }
    .commit-meta time {
      flex-basis: 100%;
      font-size: 9px;
      margin-left: 0;
    }
    .commit-title {
      font-size: 16px;
    }
    .commit-summary {
      font-size: 10px;
      line-height: 1.6;
    }
    .commit-detail dl {
      grid-template-columns: 60px minmax(0, 1fr);
    }
  }
</style>
