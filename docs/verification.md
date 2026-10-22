# Example refinement — October 21, 2026

- `npm run check`: no errors or warnings.
- `npm test`: eight TypeScript tests and two Python adapter tests pass.
- `npm run build`: app and component package build successfully.
- Public Git fixture: 80 Svelte commits, six area rails, seven change types,
  pinned source revision and upstream MIT license. The UI shows 20 rows initially;
  filtering to Fix returns 42 commits.
- Spaceflight starting views: 92 early launches, 43 crewed launches in 1961–1972,
  724 SpaceX launches, and 424 failed attempts. Switching a starting view resets
  previous filters. The existing 7,405-launch snapshot is unchanged.
- Browser: checked source-record dialog, inline launch details, Git change-type
  filtering, and reloading a direct component-docs URL. No console errors in these flows.

## Earlier verification

The following records describe the original local-only build, before standalone hosting
and the public Svelte Git example. Their fixture-specific counts are historical.

# v0.1 verification — October 14, 2026

Story: loading the Lab reads local JSON → validates the document → renders Svelte
rails/cards → user filters and edits views/documents without an upstream service.

| Boundary                  | Evidence                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| Types and Svelte          | npm run check: zero errors/warnings                                                          |
| Data semantics            | Five tests pass: dates, intervals, references, nested rails, filters and launch fixture      |
| Build and packaging       | Vite production app and svelte-package component build pass                                  |
| Independent consumer      | Local npm tarball installed in a separate Svelte 5 app; Vite build passes                    |
| Framework-neutral exports | core/schema imports load directly in Node without Svelte                                     |
| Local HTTP and data → UI  | Successful local response; browser displays 7,405 attempts and 24 highlights                 |
| Full-history disclosure   | Everything shows 40 rows, Continue shows 80                                                  |
| Search and selection      | Apollo 11 query finds one event; native dialog shows its source fields                       |
| Attribute filters         | Crewed gives 363; adding China gives 17                                                      |
| Nested views              | Fictional playground collapses Design/Engineering to Work; Branches restores both            |
| Invalid input             | Bad version reports a validation error and preserves the working preview                     |
| Mobile layout             | 390px viewport: document content width equals viewport content width; no horizontal overflow |
| Console                   | No browser warnings/errors during tested flows                                               |

Two incorrect curated milestone IDs and composite-operator joins were corrected
during verification. Regression assertions cover Gemini 3, Dragon COTS 2, and
US country classification for the joint-operator STS-1 launch.

Reduced motion is implemented in CSS/transitions and reviewed in source, but not
emulated in browser QA. SSR, screen-reader testing and React/Vue are not verified
or shipped in v0.1. No hosted deployment or npm publication was performed.

## Git history example

Seven TypeScript tests plus a temporary-repository Python integration test pass.
The latter covers a root commit, binary files, an offset timestamp, and a merge
whose diff is measured against its first parent. Same-day timestamp ordering,
invalid instants and the real 12-commit snapshot are checked in TypeScript.
Svelte checks and the app/component builds pass.

Browser checks: unified/project views, an area filter matching six commits, hash
search finding one merge, and its two parent hashes plus bounded diff preview.
The original spaceflight view still loads through the unchanged snapshot.
