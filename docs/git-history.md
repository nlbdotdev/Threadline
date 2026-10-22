# Git history example

The demo shows 80 commits from [sveltejs/svelte](https://github.com/sveltejs/svelte).
The exact revision, retrieval time, selection rule and repository URL are in
`public/data/git-provenance.json`. The snapshot stays fixed until explicitly refreshed.

Views group commits into a single timeline, changed areas, subsystems, or change type.
Path rules identify compiler, runtime, tests, docs, releases, and tooling. Subsystems
use compiler phases, client/server runtime paths, and test suite directories.
These are presentation rules based on file paths, not upstream labels.
A commit appears once, preferring source changes over docs, tests, and release files;
its tags and area filter still include every area it touches.

Change type comes from the commit subject's conventional prefix (`fix`, `feat`,
`docs`, `test`, `chore`), with `Version Packages` classified as a release. Unmatched
subjects remain Other. Squash commits are shown as commits, not invented merges.

Svelte is MIT licensed. The bundled metadata includes subjects, hashes, dates and
path summaries, with links to the original commits. The upstream copyright and
license text are retained in `public/data/svelte-LICENSE.txt`. No source file contents
or author emails are bundled. This example is not affiliated with the Svelte team.

Commit IDs are full hashes. UTC timestamps retain seconds; the original committer
timestamp and offset are retained as metadata. Selection uses Git's first-parent
path, but display sorting uses committer time. Rebase, amend, imported history or
clock skew can make time order differ from ancestry. Rails represent touched
categories, not branch topology. Parent hashes remain visible in details.

Change counts and path previews compare each commit with its first parent; merge
commits therefore show their net change relative to that parent. Root commits use
an empty-tree comparison. Binary files have a count but no fabricated line totals.
Only the first eight changed paths are shown, explicitly labeled as a preview.
No commit bodies, author emails or file contents are included.

## Try another local repository

```sh
npm run data:git -- --repo /path/to/repo --ref HEAD --limit 80
# Optional explicit commit links:
npm run data:git -- --repo /path/to/repo --ref main --limit 80 \
  --url https://github.com/owner/repo
```

This replaces only the Git example's source fixture and provenance manifest.
Limit is 1–100; ref is resolved to a commit before reading history. The adapter
does not contact remotes, change checkouts, or read remote credentials. Supply a
repository HTTPS URL explicitly if links are wanted. No branch names are inferred
from paths or commit subjects. The default repository is Threadline.

```sh
npm run check
npm test
npm run build
```

The source fixture is offline and fixed to a revision, so the example does not
continually ingest its own commits. Refresh explicitly when a new slice is useful.
`public/data/git-provenance.json` records revision, capture time, selection and
diff methodology. The Lab is hosted at https://threadline.nlb.dev.

## Reproduce the bundled example

Clone the public repository with at least 100 first-parent commits available, then run:

```sh
npm run data:git -- --repo /path/to/svelte --ref REVISION --limit 80 \
  --url https://github.com/sveltejs/svelte
```

Replace `REVISION` with the full hash from the provenance manifest. The adapter
reads Git locally; builds and tests do not contact GitHub. Preserve the bundled
Svelte license when refreshing the snapshot.
