#!/usr/bin/env python3
"""Check distributable links, syntax and unwanted local/private material."""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    failures = []
    required = ['SKILL.md', 'README.md', 'agents/openai.yaml', 'assets/editor/core.js', 'assets/editor/editor.js', 'scripts/build_editor.py']
    for name in required:
        if not (ROOT / name).is_file():
            failures.append(f'Missing {name}')
    for file in ROOT.rglob('*'):
        if not file.is_file() or '__pycache__' in file.parts:
            continue
        if file.suffix in ('.md', '.yaml'):
            text = file.read_text(encoding='utf-8')
            if re.search(r'[A-Z]:[\\/](Users|desktop)|file:///', text):
                failures.append(f'Local or historical project reference: {file.relative_to(ROOT)}')
            for target in re.findall(r'\]\(([^)]+)\)', text):
                if '://' in target or target.startswith('#'):
                    continue
                target = target.split('#')[0]
                if not (file.parent / target).exists():
                    failures.append(f'Broken link: {file.relative_to(ROOT)} -> {target}')
        if file.suffix in ('.js', '.cjs'):
            result = subprocess.run(['node', '--check', str(file)], capture_output=True, text=True)
            if result.returncode:
                failures.append(result.stderr.strip())
    if failures:
        raise SystemExit('\n'.join(failures))
    print('Package links, JavaScript syntax and publication scope checks passed.')


if __name__ == '__main__':
    main()
