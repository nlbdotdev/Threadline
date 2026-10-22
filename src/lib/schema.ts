import { z } from 'zod';

const id = z.string().min(1).max(160);
const dateValue = z.string().regex(/^\d{4}(?:-\d{2}(?:-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?)?)?$/);
export const eventSchema = z
  .object({
    id,
    title: z.string().min(1),
    summary: z.string().default(''),
    date: z
      .object({
        start: dateValue.nullable(),
        end: dateValue.optional(),
        ongoing: z.boolean().optional(),
        approximate: z.boolean().optional(),
      })
      .strict(),
    featured: z.boolean().default(false),
    attributes: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
    tags: z.array(z.string()).default([]),
    sources: z
      .array(z.object({ label: z.string(), url: z.url({ protocol: /^https?$/ }) }).strict())
      .default([]),
  })
  .strict();
export const dimensionSchema = z
  .object({
    id,
    label: z.string(),
    values: z.array(
      z
        .object({
          id,
          label: z.string(),
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          parent: id.optional(),
        })
        .strict(),
    ),
  })
  .strict();
export const viewSchema = z
  .object({
    id,
    label: z.string(),
    mode: z.enum(['unified', 'split']),
    dimension: id,
    featuredOnly: z.boolean().optional(),
    depth: z.enum(['parent', 'leaf']).default('leaf'),
  })
  .strict();
export const documentSchema = z
  .object({
    version: z.literal(1),
    id,
    title: z.string().min(1),
    description: z.string().default(''),
    dimensions: z.array(dimensionSchema).min(1),
    views: z.array(viewSchema).min(1),
    events: z.array(eventSchema),
  })
  .strict();
export type TimelineEvent = z.infer<typeof eventSchema>;
export type Dimension = z.infer<typeof dimensionSchema>;
export type TimelineView = z.infer<typeof viewSchema>;
export type ThreadlineDocument = z.infer<typeof documentSchema>;

function validDate(value: string) {
  if (value.slice(0, 4) === '0000') return false;
  if (value.includes('T')) {
    const parsed = new Date(value);
    return (
      Number.isFinite(parsed.valueOf()) && parsed.toISOString() === value.replace('Z', '.000Z')
    );
  }
  const full = value.length === 4 ? `${value}-01-01` : value.length === 7 ? `${value}-01` : value;
  const parsed = new Date(`${full}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === full;
}
function unique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label} IDs`);
}
/** Validate both the portable JSON structure and cross-record semantics. */
export function parseDocument(input: unknown): ThreadlineDocument {
  const doc = documentSchema.parse(input);
  unique(
    doc.events.map((x) => x.id),
    'event',
  );
  unique(
    doc.views.map((x) => x.id),
    'view',
  );
  unique(
    doc.dimensions.map((x) => x.id),
    'dimension',
  );
  for (const dim of doc.dimensions) {
    unique(
      dim.values.map((x) => x.id),
      `${dim.id} value`,
    );
    if (dim.values.some((x) => x.id === '__other'))
      throw new Error('__other is reserved for overflow rails');
    for (const value of dim.values) {
      const seen = new Set([value.id]);
      let parent = value.parent;
      while (parent) {
        if (seen.has(parent)) throw new Error(`Cycle in ${dim.id} hierarchy`);
        seen.add(parent);
        const ancestor = dim.values.find((x) => x.id === parent);
        if (!ancestor) throw new Error(`Unknown parent ${parent}`);
        parent = ancestor.parent;
      }
    }
  }
  for (const view of doc.views)
    if (!doc.dimensions.some((x) => x.id === view.dimension))
      throw new Error(`Unknown dimension ${view.dimension}`);
  for (const event of doc.events) {
    for (const date of [event.date.start, event.date.end])
      if (date && !validDate(date)) throw new Error(`Invalid calendar date on ${event.id}`);
    if (event.date.end) {
      const value = event.date.start;
      const start =
        value?.length === 4
          ? `${value}-01-01T00:00:00Z`
          : value?.length === 7
            ? `${value}-01T00:00:00Z`
            : value?.length === 10
              ? `${value}T00:00:00Z`
              : value;
      const end =
        event.date.end.length === 4
          ? `${event.date.end}-12-31T23:59:59Z`
          : event.date.end.length === 7
            ? `${event.date.end}-${new Date(Date.UTC(Number(event.date.end.slice(0, 4)), Number(event.date.end.slice(5, 7)), 0)).getUTCDate()}T23:59:59Z`
            : event.date.end.length === 10
              ? `${event.date.end}T23:59:59Z`
              : event.date.end;
      if (!start || end < start || event.date.ongoing)
        throw new Error(`Invalid interval on ${event.id}`);
    }
    for (const dim of doc.dimensions) {
      const attr = event.attributes[dim.id];
      for (const value of Array.isArray(attr) ? attr : attr ? [attr] : [])
        if (!dim.values.some((x) => x.id === value))
          throw new Error(`Unknown ${dim.id} value ${value}`);
    }
  }
  return doc;
}
