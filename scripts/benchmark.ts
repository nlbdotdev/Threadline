import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import * as current from '../src/lib/core.js';
import { parseDocument, type ThreadlineDocument } from '../src/lib/schema.js';

const source = JSON.parse(readFileSync('public/data/spaceflight.json', 'utf8'));
const doc = parseDocument(source);
const baselinePath = process.argv[2];
const baseline: typeof current = baselinePath
  ? await import(pathToFileURL(resolve(baselinePath)).href)
  : current;
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const results: {
  rows: number;
  operation: string;
  baselineMs: number;
  currentMs: number;
  speedup: number;
}[] = [];
for (const size of [doc.events.length, 50_000]) {
  const dataset: ThreadlineDocument =
    size === doc.events.length
      ? doc
      : {
          ...doc,
          events: Array.from({ length: size }, (_, i) => ({
            ...doc.events[i % doc.events.length],
            id: `synthetic-${i}`,
          })),
        };
  const view = dataset.views.find((x) => x.id === 'everything')!;
  const jobs = [
    { name: 'All events', run: (core: typeof current) => core.selectEvents(dataset, view) },
    {
      name: 'Broad search: Falcon',
      run: (core: typeof current) => core.selectEvents(dataset, view, { query: 'Falcon' }),
    },
    {
      name: 'Rare search: Apollo 11',
      run: (core: typeof current) => core.selectEvents(dataset, view, { query: 'Apollo 11' }),
    },
    {
      name: 'Parent filter: NASA',
      run: (core: typeof current) =>
        core.selectEvents(dataset, view, { filters: { organization: 'NASA' } }),
    },
    {
      name: 'Format 1,000 dates',
      run: (core: typeof current) => dataset.events.slice(0, 1000).map(core.formatDate),
    },
  ];
  for (const job of jobs) {
    const before = job.run(baseline);
    const after = job.run(current);
    assert.deepEqual(after, before, `${job.name} changed results`);
    const times = { baseline: [] as number[], current: [] as number[] };
    for (let round = 0; round < 9; round++) {
      for (const key of round % 2
        ? (['current', 'baseline'] as const)
        : (['baseline', 'current'] as const)) {
        const start = performance.now();
        job.run(key === 'baseline' ? baseline : current);
        times[key].push(performance.now() - start);
      }
    }
    const baselineMs = median(times.baseline),
      currentMs = median(times.current);
    results.push({
      rows: size,
      operation: job.name,
      baselineMs,
      currentMs,
      speedup: baselineMs / currentMs,
    });
  }
}
const report = {
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  measuredAt: new Date().toISOString(),
  rounds: 9,
  baseline: baselinePath ?? 'current implementation',
  caveat:
    'Core-only Node timings, not browser interaction/FPS. 50,000 events are synthetic duplicates with unique IDs.',
  results,
};
mkdirSync('output/performance', { recursive: true });
writeFileSync('output/performance/benchmark.json', JSON.stringify(report, null, 2) + '\n');
console.table(
  results.map((x) => ({
    rows: x.rows,
    operation: x.operation,
    beforeMs: x.baselineMs.toFixed(2),
    afterMs: x.currentMs.toFixed(2),
    speedup: `${x.speedup.toFixed(1)}x`,
  })),
);
