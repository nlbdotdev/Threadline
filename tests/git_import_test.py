import importlib.util
from pathlib import Path
import os
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('import_git', Path(__file__).resolve().parents[1] / 'scripts/import_git.py')
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)

class GitImportTest(unittest.TestCase):
    def test_first_parent_merges_binary_and_exact_time(self):
        with tempfile.TemporaryDirectory(prefix='threadline-git-') as folder:
            repo = Path(folder)
            def git(*args, hour=10):
                env = {**os.environ, 'GIT_CONFIG_GLOBAL': os.devnull, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_AUTHOR_DATE': f'2026-10-14T{hour:02}:00:00+02:00', 'GIT_COMMITTER_DATE': f'2026-10-14T{hour:02}:00:00+02:00'}
                return subprocess.check_output(['git', '-C', folder, '-c', 'user.name=Threadline Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', *args], env=env, text=True).strip()
            git('init', '-q', '-b', 'main')
            file = repo / 'projects/apps/demo/index.txt'
            file.parent.mkdir(parents=True)
            file.write_text('first\n')
            (file.parent / 'binary.bin').write_bytes(b'\0\xff\0')
            git('add', '.'); git('commit', '-qm', 'Start the project')
            git('checkout', '-qb', 'feature')
            (file.parent / 'feature.txt').write_text('feature\n')
            git('add', '.'); git('commit', '-qm', 'Feature detail', hour=11)
            feature = git('rev-parse', 'HEAD')
            git('checkout', '-q', 'main')
            file.write_text('first\nsecond\n')
            git('add', '.'); git('commit', '-qm', 'Improve main', hour=12)
            git('merge', '--no-ff', '-qm', 'Merge feature', 'feature', hour=13)
            doc, manifest = adapter.build_document(repo, limit=3, url='https://github.com/example/repo')
            self.assertEqual(manifest['commitCount'], 3)
            self.assertEqual(doc['events'][0]['attributes']['change'], 'merge')
            self.assertEqual(doc['events'][0]['date']['start'], '2026-10-14T11:00:00Z')
            self.assertEqual(doc['events'][0]['attributes']['filesChanged'], '1')
            self.assertEqual(doc['events'][0]['attributes']['pathPreview'], ['projects/apps/demo/feature.txt'])
            self.assertNotIn(feature, [event['id'] for event in doc['events']])
            self.assertEqual(doc['events'][-1]['attributes']['binaryFiles'], '1')
            self.assertEqual(doc['events'][-1]['attributes']['parents'], [])
            self.assertTrue(all('author' not in event['attributes'] for event in doc['events']))

if __name__ == '__main__': unittest.main()
