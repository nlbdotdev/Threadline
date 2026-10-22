import type { Dimension, ThreadlineDocument, TimelineEvent, TimelineView } from './schema.js';
export type Rail = { id: string; label: string; color: string };
export type Selection = {
  query?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, string>;
  from?: string;
  to?: string;
};
export function valuesOf(event: TimelineEvent, key: string): string[] {
  const value = event.attributes[key];
  return Array.isArray(value) ? value : value ? [value] : [];
}
export function matchesValue(event: TimelineEvent, dimension: Dimension, value: string): boolean {
  return valuesOf(event, dimension.id).some((id) => {
    let current = dimension.values.find((x) => x.id === id);
    while (current) {
      if (current.id === value) return true;
      current = dimension.values.find((x) => x.id === current?.parent);
    }
    return false;
  });
}
export function selectEvents(doc: ThreadlineDocument, view: TimelineView, options: Selection = {}) {
  const query = options.query?.trim().toLocaleLowerCase() ?? '';
  const direction = options.order === 'desc' ? -1 : 1;
  // Compile lookups once per selection, without retaining stale document caches.
  const requestedFilters = Object.entries(options.filters ?? {}).filter(([, value]) => value);
  const lookups =
    query || requestedFilters.length
      ? doc.dimensions.map((dimension) => ({
          dimension,
          values: new Map(dimension.values.map((value) => [value.id, value])),
        }))
      : [];
  const predicates = requestedFilters.map(([key, selected]) => {
    const lookup = lookups.find((x) => x.dimension.id === key);
    const accepted = new Set<string>();
    if (lookup)
      for (const value of lookup.values.values()) {
        let current: typeof value | undefined = value;
        while (current) {
          if (current.id === selected) {
            accepted.add(value.id);
            break;
          }
          current = current.parent ? lookup.values.get(current.parent) : undefined;
        }
      }
    return { key, accepted };
  });
  return doc.events
    .filter((event) => {
      if (view.featuredOnly && !event.featured) return false;
      if (options.from && (!event.date.start || event.date.start < options.from)) return false;
      if (
        options.to &&
        (!event.date.start || event.date.start.slice(0, options.to.length) > options.to)
      )
        return false;
      if (
        !predicates.every(({ key, accepted }) =>
          valuesOf(event, key).some((value) => accepted.has(value)),
        )
      )
        return false;
      if (!query) return true;
      const labels = lookups.flatMap(({ dimension, values }) =>
        valuesOf(event, dimension.id).map((id) => values.get(id)?.label ?? id),
      );
      return [
        event.title,
        event.summary,
        ...event.tags,
        ...Object.values(event.attributes).flat(),
        ...labels,
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query);
    })
    .sort((a, b) => {
      if (!a.date.start) return b.date.start ? 1 : a.id.localeCompare(b.id);
      if (!b.date.start) return -1;
      return a.date.start.localeCompare(b.date.start) * direction || a.id.localeCompare(b.id);
    });
}
export function valueFor(event: TimelineEvent, dimension: Dimension, depth: TimelineView['depth']) {
  let value = dimension.values.find((x) => x.id === valuesOf(event, dimension.id)[0]);
  if (depth === 'parent')
    while (value?.parent) value = dimension.values.find((x) => x.id === value?.parent);
  return value;
}
/** Keep declared rail order stable through filtering; cap large dimensions explicitly. */
export function railsFor(doc: ThreadlineDocument, view: TimelineView, maxRails = 7): Rail[] {
  const dimension = doc.dimensions.find((x) => x.id === view.dimension)!;
  const used = new Set(
    doc.events.map((event) => valueFor(event, dimension, view.depth)?.id ?? 'unknown'),
  );
  const all: Rail[] = dimension.values.filter((x) => used.has(x.id));
  if (used.has('unknown') && !all.some((x) => x.id === 'unknown'))
    all.push({ id: 'unknown', label: 'Unknown', color: '#777777' });
  if (all.length <= maxRails) return all;
  return [
    ...all.slice(0, Math.max(1, maxRails - 1)),
    { id: '__other', label: 'Other', color: '#777777' },
  ];
}
export function railFor(
  event: TimelineEvent,
  doc: ThreadlineDocument,
  view: TimelineView,
  rails: Rail[],
) {
  const dim = doc.dimensions.find((x) => x.id === view.dimension)!;
  const value = valueFor(event, dim, view.depth);
  return (
    rails.find((x) => x.id === (value?.id ?? 'unknown')) ??
    rails.find((x) => x.id === '__other') ??
    rails[0]
  );
}
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
export function formatDate(event: TimelineEvent) {
  const format = (value: string) =>
    value.length === 4
      ? value
      : formatter(value).format(
          new Date(
            value.includes('T') ? value : `${value.length === 7 ? `${value}-01` : value}T00:00:00Z`,
          ),
        ) + (value.includes('T') ? ' UTC' : '');
  if (!event.date.start) return 'Undated';
  return `${event.date.approximate ? 'c. ' : ''}${format(event.date.start)}${event.date.ongoing ? ' — Present' : event.date.end ? ` — ${format(event.date.end)}` : ''}`;
}
function formatter(value: string) {
  const precision = value.includes('T') ? 'instant' : value.length === 7 ? 'month' : 'day';
  let result = dateFormatters.get(precision);
  if (!result) {
    result = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      ...(value.length >= 10 ? { day: 'numeric' as const } : {}),
      ...(value.includes('T')
        ? {
            hour: '2-digit' as const,
            minute: '2-digit' as const,
            second: '2-digit' as const,
            hourCycle: 'h23' as const,
          }
        : {}),
      timeZone: 'UTC',
    });
    dateFormatters.set(precision, result);
  }
  return result;
}
