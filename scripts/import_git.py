"""Read a bounded first-parent Git slice into a portable Threadline document.

No network, checkout changes, author emails, commit bodies or file contents.
Diffs for merges are against their first parent. Paths are only a small preview.
"""
import argparse
import collections
import datetime as dt
import json
from pathlib import Path
import subprocess
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
PALETTE = ['#476e5e', '#b97345', '#6486a5', '#9a6e89', '#c39a42', '#627a7d']
CATEGORIES = {'apps': 'Web apps', 'games': 'Games', 'mac-apps': 'Mac apps',
              'chrome-extensions': 'Chrome extensions', 'vscode-extensions': 'VS Code extensions'}

def area(path):
    parts = path.split('/')
    if len(parts) >= 4 and parts[0] == 'projects':
        root = parts[1]
        return f'{root}/{parts[2]}', parts[2].replace('-', ' ').title(), root, CATEGORIES.get(root, root)
    if len(parts) >= 3 and parts[0] == 'utilities':
        return f'utilities/{parts[1]}', parts[1].replace('-', ' ').title(), 'utilities', 'Utilities'
    if path.startswith('packages/svelte/src/compiler/'):
        section = parts[4] if parts[4] != 'phases' else parts[5]
        label = section.split('-', 1)[-1].replace('-', ' ').title()
        return f'compiler/{section}', label, 'compiler', 'Compiler'
    if path.startswith('packages/svelte/src/internal/'):
        section = parts[4] if len(parts) > 4 else 'shared'
        return f'runtime/{section}', section.title(), 'runtime', 'Runtime'
    if path.startswith('packages/svelte/src/'):
        section = parts[3]
        return f'runtime/{section}', section.replace('-', ' ').title(), 'runtime', 'Runtime'
    if path.startswith('packages/svelte/tests/'):
        section = parts[3]
        return f'tests/{section}', section.replace('-', ' ').title(), 'tests', 'Tests'
    if parts[0] in ('documentation', 'docs') or path.endswith('.md') and parts[0] not in ('.changeset', '.github') and not path.endswith('CHANGELOG.md'):
        return 'docs', 'Documentation', 'docs', 'Docs'
    if parts[0] == '.changeset' or path.endswith(('CHANGELOG.md', 'package.json', 'src/version.js')):
        return 'releases', 'Versioning & release notes', 'releases', 'Releases'
    if parts[0] == 'showcase':
        return 'catalog', 'Showcase', 'repository', 'Repository'
    return 'maintenance', 'Build & repository', 'tooling', 'Tooling'

def change_kind(subject):
    if subject.startswith('Version Packages'): return 'release'
    prefix = subject.split(':', 1)[0].split('(', 1)[0].rstrip('!').lower()
    return prefix if prefix in ('fix', 'feat', 'docs', 'test', 'chore') else 'other'

def build_document(repo, ref='HEAD', limit=12, url=None):
    def git(*args):
        return subprocess.check_output(['git', '-C', str(repo), *args], text=True)
    head = git('rev-parse', '--verify', '--end-of-options', f'{ref}^{{commit}}').strip()
    shas = git('rev-list', '--first-parent', f'--max-count={limit}', head).splitlines()
    repo_name = urlparse(url).path.rstrip('/').split('/')[-1].removesuffix('.git') if url else repo.name
    events = []
    leaves = {}
    groups = {}
    counts = collections.Counter()
    for sha in shas:
        full, parents_text, original_time, subject = git('show', '-s', '--format=%H%x00%P%x00%cI%x00%s', sha).rstrip('\n').split('\0')
        parents = parents_text.split()
        diff_args = ('diff', parents[0], sha) if parents else ('diff-tree', '--root', '--no-commit-id', '-r', sha)
        paths = [path for path in git(*diff_args, '--name-only', '-z').split('\0') if path]
        added = removed = binary = 0
        for row in git(*diff_args, '--numstat').splitlines():
            cols = row.split('\t')
            if len(cols) >= 3:
                if cols[0] == '-' or cols[1] == '-': binary += 1
                else: added += int(cols[0]); removed += int(cols[1])
        touched = collections.Counter()
        for path in paths:
            leaf, label, group, group_label = area(path)
            # A distinct prefix avoids a leaf ID accidentally colliding with a parent.
            leaf_id = f'area:{leaf}'
            group_id = f'group:{group}'
            leaves[leaf_id] = (label, group_id)
            groups[group_id] = group_label
            touched[leaf_id] += 1
        if not touched:
            leaves['area:maintenance'] = ('Repository maintenance', 'group:repository')
            groups['group:repository'] = 'Repository'
            touched['area:maintenance'] = 1
        # Prefer actual project work to cross-cutting catalog bookkeeping.
        priority = {'group:compiler': 0, 'group:runtime': 0, 'group:docs': 1, 'group:tests': 2, 'group:releases': 3, 'group:tooling': 4}
        areas = sorted(touched, key=lambda key: (priority.get(leaves[key][1], 0), key in ('area:maintenance', 'area:catalog'), -touched[key], key))
        counts.update(touched)
        stamp = dt.datetime.fromisoformat(original_time).astimezone(dt.timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
        attrs = {'area': areas, 'change': 'merge' if len(parents) > 1 else 'commit',
                 'kind': change_kind(subject), 'sha': full, 'parents': parents, 'sourceCommitterTime': original_time,
                 'filesChanged': str(len(paths)), 'additions': str(added), 'deletions': str(removed),
                 'binaryFiles': str(binary), 'pathPreview': paths[:8], 'repository': repo_name}
        events.append({'id': full, 'title': subject, 'date': {'start': stamp},
                       'summary': f'{len(paths)} files changed · +{added:,} / −{removed:,}' + (f' · {binary} binary files' if binary else ''),
                       'attributes': attrs, 'tags': [leaves[key][0] for key in areas],
                       'sources': [{'label': 'View commit', 'url': f'{url.rstrip("/")}/commit/{full}'}] if url else []})
    group_order = sorted(groups, key=lambda group: -sum(counts[key] for key, (_, parent) in leaves.items() if parent == group))
    colors = {group: PALETTE[i % len(PALETTE)] for i, group in enumerate(group_order)}
    values = [{'id': group, 'label': groups[group], 'color': colors[group]} for group in group_order]
    values += [{'id': key, 'label': label, 'parent': parent, 'color': colors[parent]} for key, (label, parent) in sorted(leaves.items(), key=lambda item: -counts[item[0]])]
    document = {'version': 1, 'id': 'git-history', 'title': f'{repo_name} commit history',
                'description': f'{len(events)} commits on the first-parent path ending at {head[:8]}. Ordered by committer timestamp, with merge diffs against the first parent.',
                'dimensions': [{'id': 'area', 'label': 'Changed area', 'values': values},
                               {'id': 'kind', 'label': 'Change type', 'values': [{'id': key, 'label': label, 'color': color} for key, label, color in [('fix', 'Fix', '#476e5e'), ('feat', 'Feature', '#6486a5'), ('docs', 'Docs', '#9a6e89'), ('test', 'Test', '#c39a42'), ('chore', 'Maintenance', '#627a7d'), ('release', 'Release', '#b97345'), ('other', 'Other', '#887e70')]]},
                               {'id': 'change', 'label': 'Commit type', 'values': [{'id': 'commit', 'label': 'Commit', 'color': '#476e5e'}, {'id': 'merge', 'label': 'Merge', 'color': '#b97345'}]}],
                'views': [{'id': 'thread', 'label': 'Timeline', 'mode': 'unified', 'dimension': 'area', 'depth': 'parent'},
                          {'id': 'areas', 'label': 'Areas', 'mode': 'split', 'dimension': 'area', 'depth': 'parent'},
                          {'id': 'projects', 'label': 'Subsystems', 'mode': 'split', 'dimension': 'area', 'depth': 'leaf'},
                          {'id': 'kinds', 'label': 'Change type', 'mode': 'split', 'dimension': 'kind'}], 'events': events}
    manifest = {'repository': repo_name, 'repositoryUrl': url, 'revision': head, 'selection': 'first-parent',
                'limit': limit, 'commitCount': len(events), 'capturedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                'ordering': 'UTC committer timestamp', 'mergeDiff': 'first parent', 'pathPreviewLimit': 8, 'areaMapping': 'Changed paths; source code before docs, tests, releases and tooling', 'changeTypeMapping': 'Conventional commit subject prefix; Version Packages is release'}
    return document, manifest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=ROOT)
    parser.add_argument('--ref', default='HEAD')
    parser.add_argument('--limit', type=int, default=12)
    parser.add_argument('--url', help='Explicit HTTPS repository URL for commit links (never read credentials from remotes)')
    args = parser.parse_args()
    if not 1 <= args.limit <= 100: parser.error('--limit must be between 1 and 100')
    if args.url and not args.url.startswith('https://'): parser.error('--url must use HTTPS')
    document, manifest = build_document(args.repo.resolve(), args.ref, args.limit, args.url)
    (ROOT / 'public/data/git-history.json').write_text(json.dumps(document, indent=2) + '\n')
    (ROOT / 'public/data/git-provenance.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'{manifest["repository"]}: {manifest["commitCount"]} commits at {manifest["revision"][:8]}')

if __name__ == '__main__': main()
