# Git history: a tight adapter example

The Lab's Git history tab renders a fixed first-parent slice of this public
Threadline repository. It uses the existing Svelte component with a custom item
snippet and the same portable document model.

Views: unified thread, root areas, individual projects, and commit/merge. Areas are
derived from changed paths, with leaf projects grouped under Web apps, Games,
Utilities, extensions, or Repository. A commit can touch multiple areas. Its first
area is the primary rail; tags retain all areas and the area dropdown matches any
descendant. The primary area prefers project paths over catalog bookkeeping, then
uses changed-path counts and a stable ID tie-break. This is an explicit presentation
rule, not a Git property.

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
npm run data:git -- --repo /path/to/repo --ref HEAD --limit 12
# Optional explicit commit links:
npm run data:git -- --repo /path/to/repo --ref main --limit 12 \
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
