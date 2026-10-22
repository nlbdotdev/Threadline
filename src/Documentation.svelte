<script lang="ts">
  import { Threadline, parseDocument, type ThreadlineDocument } from './lib';
  import { example } from './example';
  let active = $state('start');
  let demo = $state<ThreadlineDocument>(example);
  let draft = $state(JSON.stringify(example, null, 2));
  let error = $state('');
  let demoView = $state('thread');
  const install = 'npm install ./nlb-threadline-0.1.0.tgz';
  const usage = `<script lang="ts">\n  import { Threadline, parseDocument } from '@nlb/threadline';\n  import data from './history.json';\n  const document = parseDocument(data);\n  let view = $state('highlights');\n<\/script>\n\n<Threadline {document} bind:view pageSize={40} />`;
  const custom = `<Threadline {document}>\n  {#snippet item(event, state)}\n    <h3>{event.title}</h3>\n    <button onclick={state.toggle}>Details</button>\n    {#if state.expanded}<p>{event.summary}</p>{/if}\n  {/snippet}\n</Threadline>`;
  const model = `{\n  "version": 1,\n  "id": "my-history",\n  "title": "A history of ideas",\n  "dimensions": [{\n    "id": "field", "label": "Field",\n    "values": [{ "id": "math", "label": "Math", "color": "#476e5e" }]\n  }],\n  "views": [{\n    "id": "all", "label": "Everything",\n    "mode": "split", "dimension": "field"\n  }],\n  "events": [{\n    "id": "idea-1", "title": "An idea",\n    "date": { "start": "1700", "approximate": true },\n    "attributes": { "field": "math" }\n  }]\n}`;
  function apply() {
    try {
      demo = parseDocument(JSON.parse(draft));
      demoView = demo.views[0].id;
      error = '';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<div class="docs-layout">
  <aside aria-label="Documentation chapters">
    <p class="eyebrow">Svelte · v0.1</p>
    {#each [{ id: 'start', label: 'Getting started' }, { id: 'model', label: 'Document model' }, { id: 'api', label: 'Component API' }, { id: 'play', label: 'Playground' }, { id: 'behavior', label: 'Behavior & access' }, { id: 'performance', label: 'Performance' }] as chapter}<button
        class:active={active === chapter.id}
        onclick={() => (active = chapter.id)}>{chapter.label}<span>↗</span></button
      >{/each}<a href="/threadline.schema.json" download>Download JSON Schema ↓</a>
  </aside>
  <div class="docs-content">
    {#if active === 'start'}
      <p class="eyebrow">First-class Svelte</p>
      <h1>A thread you can<br />make your own.</h1>
      <p class="intro">
        The document holds the story. The component gives it shape. Your application decides what
        each event looks like.
      </p>
      <h2>Use the local package</h2>
      <p>
        From this project's directory, run <code>npm run package</code> and <code>npm pack</code>.
        Install the resulting tarball into a Svelte 5 app:
      </p>
      <pre><code>{install}</code></pre>
      <p>The package is a local experiment. It has not been published to npm.</p>
      <h2>Render a document</h2>
      <pre><code>{usage}</code></pre>
      <p>
        Validation happens once at the data boundary. The renderer accepts a validated document and
        keeps presentation state separate from historical facts.
      </p>
      <h2>Bring your own cards</h2>
      <pre><code>{custom}</code></pre>
      <p>
        The <code>item</code> snippet replaces the card; the rails, markers, views, search,
        ordering, and progressive disclosure remain available. The <code>details</code> snippet replaces
        just the expanded content.
      </p>
    {:else if active === 'model'}
      <p class="eyebrow">Portable JSON · version 1</p>
      <h1>One story.<br />Many readings.</h1>
      <p class="intro">
        Events are facts. Dimensions describe them. Views decide which attributes become rails.
      </p>
      <pre><code>{model}</code></pre>
      <h2>Dates stay honest</h2>
      <p>
        Use <code>YYYY</code>, <code>YYYY-MM</code>, or <code>YYYY-MM-DD</code>, or UTC
        <code>YYYY-MM-DDTHH:mm:ssZ</code>. Precision comes from the string itself. Use
        <code>null</code>
        for unknown dates, <code>approximate</code>
        for uncertain ones, and <code>end</code> or <code>ongoing</code> for intervals. Version 1 supports
        Gregorian years 0001–9999; BCE dates are planned.
      </p>
      <h2>Nested categories</h2>
      <p>
        Values can reference a <code>parent</code> in the same dimension. A view with
        <code>depth: "parent"</code>
        collapses descendants to their root. <code>depth: "leaf"</code> unfolds them. Each event appears
        once; the first attribute value determines its rail, and all values participate in search and
        filtering.
      </p>
      <h2>Two validation layers</h2>
      <p>
        The downloadable JSON Schema checks document structure. <code>parseDocument()</code> also checks
        real calendar dates, date intervals, unique IDs, references, and cycles in category hierarchies.
      </p>
    {:else if active === 'api'}
      <p class="eyebrow">Component contract</p>
      <h1>Small surface.<br />Useful defaults.</h1>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Prop</th><th>Default</th><th>Purpose</th></tr></thead><tbody
            >{#each [['document', 'Required', 'Validated ThreadlineDocument'], ['view', 'First view', 'Bindable named view ID'], ['query', 'Empty', 'Bindable case-insensitive search'], ['order', 'asc', 'Bindable ascending or descending date order'], ['filters', '{}', 'Dimension ID → selected value ID'], ['from / to', 'Unset', 'Inclusive start-date range, at the supplied precision'], ['guides', 'false', 'Bindable year guides'], ['pageSize', '40', 'Number of events revealed per batch'], ['maxRails', '7', 'Overflow categories share a labeled Other rail'], ['density', 'comfortable', 'comfortable or compact'], ['item / details', 'Default cards', 'Svelte snippets for content'], ['onselect', 'Unset', 'Callback when an event title is activated']] as row}<tr
                >{#each row as cell}<td>{cell}</td>{/each}</tr
              >{/each}</tbody
          >
        </table>
      </div>
      <h2>Theme tokens</h2>
      <p>
        Override <code>--tl-paper</code>, <code>--tl-ink</code>, <code>--tl-muted</code>,
        <code>--tl-border</code>, and <code>--tl-accent</code> on a wrapper or the component's
        <code>.threadline</code> root. Category colors belong to the document.
      </p>
      <h2>Framework-neutral core</h2>
      <p>
        Import <code>selectEvents</code>, <code>railsFor</code>, <code>railFor</code>, and
        <code>formatDate</code>
        from <code>@nlb/threadline/core</code>. Import <code>parseDocument</code> and TypeScript
        types from <code>@nlb/threadline/schema</code>. These entry points have no Svelte imports.
      </p>
    {:else if active === 'play'}
      <p class="eyebrow">Interactive example · fictional studio</p>
      <h1>Change the data.<br />Watch it unfold.</h1>
      <p class="intro">
        Try unified, parent, and leaf views. Edit the JSON below to test your own document; invalid
        input leaves the last working preview in place.
      </p>
      <div class="demo"><Threadline document={demo} bind:view={demoView} pageSize={5} /></div>
      <label class="editor-label" for="document-editor">Threadline document</label><textarea
        id="document-editor"
        bind:value={draft}
        spellcheck="false"></textarea>
      <div class="editor-actions">
        <button class="solid" onclick={apply}>Apply document →</button><button
          onclick={() => {
            demo = example;
            draft = JSON.stringify(example, null, 2);
            demoView = 'thread';
            error = '';
          }}>Reset example</button
        >
      </div>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
    {:else if active === 'performance'}
      <p class="eyebrow">Measured core work / rendering roadmap</p>
      <h1>Keep the story.<br />Reduce the work.</h1>
      <p class="intro">
        Small histories already render in batches. Larger histories need faster selection and an
        optional renderer that keeps only nearby rows mounted.
      </p>
      <h2>What improved</h2>
      <p>
        On the 7,405-launch dataset, a parent filter went from 4.70 to 0.43 ms; formatting 1,000
        dates went from 16.75 to 0.73 ms. These are median Node core timings, not browser FPS.
        Search barely changed, and still takes about 40 ms at 50,000 synthetic events.
      </p>
      <p>
        Category filters compile lookup maps per selection. Date formatters are reused. Geometry
        observers are disconnected in split views with guides off, and year positioning keeps just
        the first and last markers.
      </p>
      <h2>Where TanStack fits</h2>
      <p>
        An opt-in, dynamically measured window list could bound the mounted cards during long
        browsing sessions. Rails should remain decorations around one chronological lane. Its
        gradients and year guides would use virtual positions instead of assuming every event exists
        in the DOM.
      </p>
      <p>
        Expansion, focused cards, scroll anchors, browser find, and printing need explicit handling.
        TanStack has not been added to the package. <a
          href="https://tanstack.com/virtual/latest/docs/api/virtualizer"
          target="_blank"
          rel="noreferrer">Virtualizer documentation ↗</a
        >
      </p>
      <h2>What comes next</h2>
      <p>
        Lazy-load datasets, prepare search text per document revision, and share selection/count
        results. Then compare ordinary and virtual rendering with browser traces at 40, 400 and
        4,000 disclosed rows.
      </p>
      <pre><code
          >npm run benchmark
# Detailed methodology: docs/performance.md</code
        ></pre>
    {:else}
      <p class="eyebrow">Rendering principles</p>
      <h1>Readable history.<br />Honest geometry.</h1>
      <h2>Content-spaced chronology</h2>
      <p>
        Dates determine order; content determines card height. A five-pixel gap does not represent
        five days. Date ranges appear as labels, rather than proportional duration bars. A
        scaled-time view is on the roadmap.
      </p>
      <h2>Motion follows the reader</h2>
      <p>
        Rails merge and split in place. Keyed rows animate when filtered. The unified gradient is
        measured from actual event markers, and follows expansion and resizing. Reduced-motion
        preferences disable rail and row animations.
      </p>
      <h2>Accessible disclosure</h2>
      <p>
        Controls use native buttons, inputs, and selects. Selected views and rails expose their
        pressed state; detail buttons expose expansion. Result counts are announced. Hidden history
        is a decorative preview with an explicit keyboard-accessible reveal button.
      </p>
      <h2>Large documents</h2>
      <p>
        Filtering uses the complete dataset; rendering reveals bounded batches. Rail order stays
        stable when searching, and overflow is explicitly labeled Other. Automatic scroll-to-reveal
        and virtualization are planned after interaction testing.
      </p>
      <h2>What v0.1 leaves to the host</h2>
      <p>
        Media galleries, URL navigation, selection dialogs, and persistence are host integrations.
        The Lab demonstrates a selection dialog and URL state. The Svelte renderer is
        client-mounted; server rendering and controlled per-event expansion are planned.
      </p>
    {/if}
  </div>
</div>
