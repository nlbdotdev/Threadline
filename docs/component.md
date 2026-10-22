# Svelte component

Install the local tarball described in README.md into a Svelte 5 application. The
package uses native Svelte snippets, runes and scoped styles. No SvelteKit runtime
is required. Version 0.1 is client-mounted; SSR support is planned.

## Props

| Prop      | Default             | Contract                                                                          |
| --------- | ------------------- | --------------------------------------------------------------------------------- |
| document  | Required            | Validated ThreadlineDocument                                                      |
| view      | First declared view | Bindable named view ID; unknown IDs use the first view                            |
| query     | Empty               | Bindable case-insensitive search over text, tags, attributes and dimension labels |
| order     | asc                 | Bindable asc/desc date order; unknown dates always last                           |
| filters   | {}                  | Dimension IDs mapped to selected value IDs; descendants match parents             |
| from / to | Unset               | Inclusive event start-date bounds at supplied precision                           |
| guides    | false               | Bindable year guide visibility                                                    |
| pageSize  | 40                  | Initial and incremental disclosure batch size                                     |
| maxRails  | 7                   | Stable declared rail order; overflow grouped into Other                           |
| density   | comfortable         | comfortable or compact                                                            |
| item      | Default card        | Snippet receiving event and { expanded, toggle }                                  |
| details   | Default attributes  | Snippet receiving event                                                           |
| onselect  | Unset               | Callback when a default event title is activated                                  |

The first dimension attribute value assigns an event to one rail. All attribute
values participate in search/filtering. View changes reset history and the rail
filter; expansion survives by event ID. Expand-all applies to displayed cards.

```svelte
<Threadline {document}>
  {#snippet item(event, state)}
    <h3>{event.title}</h3>
    <button onclick={state.toggle} aria-expanded={state.expanded}>Details</button>
    {#if state.expanded}<p>{event.summary}</p>{/if}
  {/snippet}
</Threadline>
```

Custom cards own their semantic HTML, focus behavior and expansion UI. Rails and
markers stay outside the snippet. Sources are only automatically rendered with the
default card; custom cards decide where to show them.

## Styling and access

Inherited CSS custom properties: --tl-paper, --tl-ink, --tl-muted, --tl-border,
--tl-accent. Override on a wrapper. Colors in the document use six-digit hex.

Native controls expose selected/expanded states, results use a polite live region,
and reduced-motion preferences disable rail, row and detail transitions. Archive
previews are decorative; an explicit button reveals more events. There is no
automatic scroll reveal yet. Inline detail focus uses native browser behavior.

## Framework-neutral exports

`@nlb/threadline/core`: selectEvents, valuesOf, matchesValue, valueFor, railsFor,
railFor, formatDate, Selection and Rail types.

`@nlb/threadline/schema`: parseDocument, documentSchema, eventSchema,
dimensionSchema, viewSchema and inferred TypeScript types.

`@nlb/threadline/schema.json`: portable structural JSON Schema.

The entry points above do not import Svelte. This is the integration boundary for
future React/Vue renderers. Media galleries, URL persistence and selection dialogs
are host integrations. The Lab demonstrates URL filters and a native dialog.
