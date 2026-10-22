# Threadline Lab

Threadline is a Svelte 5 timeline component. Events can appear in a single colored
line or split into category rails. A JSON format defines events, dates, categories,
and views; the filtering and date utilities are plain TypeScript.

Try it with [spaceflight launches](https://threadline.nlb.dev) or
[Svelte's Git history](https://threadline.nlb.dev/?example=git).
[Component docs and playground](https://threadline.nlb.dev/?page=docs) are included.
React and Vue adapters are planned.

## Develop

Node.js 22.12+ and npm; this project owns its dependency lockfile.

```sh
npm ci
npm run dev             # http://127.0.0.1:4315
npm run check
npm test
npm run build           # App → dist/, reusable component → package/
npm run preview
```

The app has an Explorer, Component documentation with a live JSON playground,
Data & sources, and Roadmap. It loads an attributed local source-data snapshot;
no database, API key, environment variable, or upstream request is needed to run.
[Live demo and docs](https://threadline.nlb.dev) · [GitHub](https://github.com/nlbdotdev/Threadline)

The demo deploys from this standalone repository on Vercel.

## Reuse in Svelte 5

```sh
npm run package
npm pack --pack-destination /tmp
# In a separate Svelte project:
npm install /tmp/nlb-threadline-0.1.0.tgz
```

```svelte
<script lang="ts">
  import { Threadline, parseDocument } from '@nlb/threadline';
  import data from './history.json';
  const document = parseDocument(data);
  let view = $state('highlights');
</script>

<Threadline {document} bind:view pageSize={40} />
```

The MIT-licensed package is not yet published to npm. Packaged files include component/core
JavaScript, TypeScript declarations, a JSON Schema, and documentation. The Lab's
large spaceflight dataset and application are excluded from the component package.

- [Component API and snippets](docs/component.md)
- [Document model and JSON Schema](docs/schema.md)
- [Design and provenance](docs/design.md)
- [Data methodology](docs/data.md)
- [Roadmap](docs/roadmap.md)
- [Git history adapter](docs/git-history.md)
- [Performance investigation and virtualization](docs/performance.md)

`npm run benchmark` measures the framework-neutral core on the real launch fixture
and a synthetic 50,000-event stress case. See the performance notes for a reproducible
before/after comparison and the proposed opt-in TanStack renderer.

## Second experiment: Git history

Open **Git history** in the Lab, or visit `http://127.0.0.1:4315/?example=git`.
The example uses 80 public commits from [Svelte](https://github.com/sveltejs/svelte),
with timeline, area, subsystem, and change-type views. Hashes, exact UTC committer
times, parent links, diff counts, and a bounded path preview remain inspectable.
Rails show touched categories; parent hashes carry Git ancestry.

To try another local repository:

```sh
npm run data:git -- --repo /path/to/repo --ref HEAD --limit 12
```

## First experiment: spaceflight

The checked-in source fixture has **7,405 orbital/deep-space launch attempts**, 24
selected milestones, and 363 matched human orbital flights. Views include a unified
thread, crew, country, organization roots/branches, and outcomes. Launch site is an
attribute. Failed launches are included; pad aborts, pad explosions, and suborbital
launches are outside this first scope. Dates and upstream identifiers are retained.

Data from GCAT (J. McDowell, [planet4589.org/space/gcat](https://planet4589.org/space/gcat/)),
licensed CC BY 4.0. Classification also uses McDowell's human-flight mission list.
Full hashes, source URLs, updates and retrieval time are in
`public/data/provenance.json`. The snapshot is source data used by the demo, not a
build artifact. No source repository or portfolio assets were imported.

Refresh explicitly, inspect the resulting diff, then run checks:

```sh
npm run data:import
npm run check
npm test
npm run build
```

Regenerate the portable structural schema after changing `src/lib/schema.ts`:

```sh
npm run schema
```

Build/package output, raw downloads, screenshots and dependency directories are
ignored.

## License

Threadline code and documentation are [MIT licensed](LICENSE).
The spaceflight dataset retains its CC BY 4.0 license, and the Svelte Git example
retains its upstream MIT attribution. See [NOTICE.md](NOTICE.md) for source credits.
