# Threadline document v1

```json
{
  "version": 1,
  "id": "ideas",
  "title": "A history of ideas",
  "dimensions": [
    {
      "id": "field",
      "label": "Field",
      "values": [{ "id": "math", "label": "Math", "color": "#476e5e" }]
    }
  ],
  "views": [
    {
      "id": "all",
      "label": "Everything",
      "mode": "split",
      "dimension": "field"
    }
  ],
  "events": [
    {
      "id": "idea-1",
      "title": "An idea",
      "date": { "start": "1700", "approximate": true },
      "attributes": { "field": "math" }
    }
  ]
}
```

This is an illustrative record, not a claim about a real discovery.

Events have stable IDs, titles, optional summary/featured/tags/sources, and required
date and attribute semantics. Attributes are strings or string arrays. Registered
dimension values are checked; unregistered attributes remain metadata. Sources
use http/https URLs. Raw HTML is not a document field; snippets render trusted
host content.

## Dates and ordering

- start: YYYY, YYYY-MM, YYYY-MM-DD, YYYY-MM-DDTHH:mm:ssZ, or null. Supported Gregorian years 0001–9999.
- Instants use UTC at second precision. Convert source offsets to UTC and retain
  the original value in attributes when needed. Same-day instants sort by time.
- end: optional partial date, requiring a start. Cannot combine with ongoing.
- ongoing: an open interval; approximate: uncertain dating.
- Intervals are rejected only when the latest possible end precedes the earliest
  possible start. Date precision is preserved in labels and source data.
- Rows sort by start date, then ID. Unknown dates sort last in both directions.
- This is content-spaced chronology. Neither vertical gaps nor row height express
  elapsed time or interval duration. There is no editorial placement override yet.

## Dimensions and views

Each dimension has an ID, label and ordered values; each value has an ID, label,
hex color and optional parent. Hierarchies must be acyclic and references valid.
The same event can have multiple dimension values, but is drawn once on the first
value's rail. Missing dimension attributes use an Unknown rail.

Views name a dimension, choose unified/split, and optionally select featuredOnly.
depth: parent collapses to root values; depth: leaf preserves individual values.
Views contain no executable code. Presentation selection and expansion are not
historical facts and are not stored on events.

The generated JSON Schema validates structure. parseDocument additionally validates
real calendar dates, intervals, unique IDs, value references, view references and
hierarchy cycles. External consumers should implement these semantic checks too.
Changes that invalidate v1 documents require a new version and migration.
