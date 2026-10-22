import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { example } from '../src/example.js';
import { parseDocument } from '../src/lib/schema.js';
import { selectEvents, railsFor, railFor, formatDate } from '../src/lib/core.js';

test('partial and unknown dates keep their precision; unknown dates sort last in both directions', () => {
  const asc = selectEvents(example, example.views[0]);
  const desc = selectEvents(example, example.views[0], { order: 'desc' });
  assert.equal(asc[0].id, 'first');
  assert.equal(desc[0].id, 'now');
  assert.equal(asc.at(-1)?.id, 'unknown');
  assert.equal(desc.at(-1)?.id, 'unknown');
  assert.equal(formatDate(asc[0]), 'c. 2021');
  assert.match(formatDate(desc[0]), /Jun 2024 — Present/);
  assert.equal(example.events[0].date.start, '2021');
});
test('nested rails collapse at roots; parent filters retain descendant events', () => {
  const parent = example.views[1];
  const rails = railsFor(example, parent);
  assert.deepEqual(
    rails.map((x) => x.id),
    ['work', 'learning'],
  );
  assert.equal(railFor(example.events[0], example, parent, rails)?.id, 'work');
  const filtered = selectEvents(example, parent, { filters: { discipline: 'work' } });
  assert.equal(filtered.length, 4);
  assert.equal(selectEvents(example, parent, { filters: { unknown: 'x' } }).length, 0);
});
test('filtering works across full history, labels and dates without mutating the source', () => {
  const before = JSON.stringify(example);
  assert.equal(selectEvents(example, example.views[0], { query: 'engineering' }).length, 2);
  assert.equal(selectEvents(example, example.views[0], { from: '2022', to: '2023' }).length, 2);
  assert.equal(selectEvents(example, { ...example.views[0], featuredOnly: true }).length, 0);
  assert.equal(JSON.stringify(example), before);
});
test('selection observes edits to labels and hierarchy rather than caching mutable documents', () => {
  const doc = structuredClone(example);
  const view = doc.views[0];
  assert.equal(selectEvents(doc, view, { query: 'Craftsmanship' }).length, 0);
  doc.dimensions[0].values.find((x) => x.id === 'engineering')!.label = 'Craftsmanship';
  assert.equal(selectEvents(doc, view, { query: 'Craftsmanship' }).length, 2);
  doc.dimensions[0].values.find((x) => x.id === 'engineering')!.parent = 'learning';
  assert.equal(selectEvents(doc, view, { filters: { discipline: 'learning' } }).length, 3);
});
test('invalid calendar dates, intervals, references, duplicates and hierarchy cycles are rejected', () => {
  function invalid(edit: (doc: typeof example) => void) {
    const doc = structuredClone(example);
    edit(doc);
    assert.throws(() => parseDocument(doc));
  }
  invalid((doc) => (doc.events[0].date.start = '2023-02-29'));
  invalid((doc) => (doc.events[0].date.start = '0000'));
  invalid((doc) => (doc.events[1].date.end = '2020'));
  invalid((doc) => (doc.events[1].date.ongoing = true));
  invalid((doc) => doc.events.push(doc.events[0]));
  invalid((doc) => (doc.events[0].attributes.discipline = 'missing'));
  invalid((doc) => (doc.dimensions[0].values[0].parent = 'design'));
  invalid((doc) => (doc.views[0].dimension = 'missing'));
  invalid((doc) => doc.events[0].sources.push({ label: 'Unsafe', url: 'javascript:alert(1)' }));
  const mixed = structuredClone(example);
  mixed.events[1].date.end = '2022';
  assert.doesNotThrow(() => parseDocument(mixed));
});
test('spaceflight snapshot has one event per attempt, traceable crew classifications and bounded rails', () => {
  const doc = parseDocument(JSON.parse(readFileSync('public/data/spaceflight.json', 'utf8')));
  const manifest = JSON.parse(readFileSync('public/data/provenance.json', 'utf8'));
  assert.equal(doc.events.length, manifest.eventCount);
  assert.equal(doc.events.filter((x) => x.featured).length, manifest.highlightCount);
  assert.equal(
    doc.events.filter((x) => x.attributes.crew === 'crewed').length,
    manifest.matchedHumanFlights,
  );
  for (const id of ['1961 MU', '1969-059', '1981-034', '2003-045', '2020-033'])
    assert.equal(doc.events.find((x) => x.id === id)?.attributes.crew, 'crewed');
  assert.equal(doc.events.find((x) => x.id === '1957 ALP')?.attributes.crew, 'uncrewed');
  const gemini = doc.events.find((x) => x.title === 'Gemini 3')!;
  assert.equal(gemini.id, '1965-024');
  assert.equal(gemini.date.start, '1965-03-23');
  assert.match(String(gemini.attributes.vehicle), /Titan/);
  const dragon = doc.events.find((x) => x.title === 'Dragon · COTS 2')!;
  assert.equal(dragon.id, '2012-027');
  assert.equal(dragon.date.start, '2012-05-22');
  assert.equal(dragon.attributes.organization, 'SPX');
  assert.equal(doc.events.find((x) => x.id === '1981-034')?.attributes.country, 'US');
  assert.ok(doc.events.some((x) => x.attributes.outcome === 'failure'));
  assert.ok(doc.events.every((x) => !['E', 'A'].includes(String(x.attributes.launchCode)[1])));
  assert.ok(
    doc.events
      .filter(
        (x) => x.date.start! >= manifest.crewCoverageThrough && x.attributes.crew !== 'crewed',
      )
      .every((x) => x.attributes.crew === 'unknown'),
  );
  assert.ok(doc.events.every((x) => x.sources.length > 0));
  const view = doc.views.find((x) => x.id === 'countries')!;
  assert.equal(railsFor(doc, view, 7).length, 7);
  assert.equal(railsFor(doc, view, 7).at(-1)?.id, '__other');
  assert.equal(selectEvents(doc, doc.views[0]).length, 24);
});

test('UTC instants preserve same-day commit order and reject impossible timestamps', () => {
  const doc = structuredClone(example);
  doc.events = [
    { ...example.events[0], id: 'aaa', date: { start: '2026-10-14T12:00:00Z' } },
    { ...example.events[0], id: 'zzz', date: { start: '2026-10-14T08:00:00Z' } },
  ];
  const parsed = parseDocument(doc);
  assert.deepEqual(
    selectEvents(parsed, parsed.views[0]).map((x) => x.id),
    ['zzz', 'aaa'],
  );
  assert.deepEqual(
    selectEvents(parsed, parsed.views[0], { order: 'desc' }).map((x) => x.id),
    ['aaa', 'zzz'],
  );
  assert.match(formatDate(parsed.events[0]), /12:00:00 UTC/);
  assert.equal(selectEvents(parsed, parsed.views[0], { to: '2026-10-14' }).length, 2);
  for (const value of [
    '2026-02-30T10:00:00Z',
    '2026-10-14T25:00:00Z',
    '2026-10-14T12:00:00+02:00',
  ]) {
    doc.events[0].date.start = value;
    assert.throws(() => parseDocument(doc));
  }
  doc.events[0].date = { start: '2026-10-14T12:00:00Z', end: '2026-10-14' };
  assert.doesNotThrow(() => parseDocument(doc));
});

test('commit snapshot carries full hashes, exact times and multiple touched areas', () => {
  const doc = parseDocument(JSON.parse(readFileSync('public/data/git-history.json', 'utf8')));
  const manifest = JSON.parse(readFileSync('public/data/git-provenance.json', 'utf8'));
  assert.equal(doc.events.length, 12);
  assert.equal(doc.events[0].id, manifest.revision);
  assert.ok(doc.events.every((event) => /^[0-9a-f]{40}$/.test(event.id)));
  assert.ok(doc.events.every((event) => event.date.start?.endsWith('Z')));
  assert.ok(
    doc.events.some(
      (event) => Array.isArray(event.attributes.area) && event.attributes.area.length > 1,
    ),
  );
  assert.ok(doc.events.some((event) => event.attributes.change === 'merge'));
  assert.equal(selectEvents(doc, doc.views[0], { order: 'desc' })[0].id, manifest.revision);
  const areas = doc.views.find((view) => view.id === 'areas')!;
  assert.ok(railsFor(doc, areas).every((rail) => rail.id.startsWith('group:')));
});
