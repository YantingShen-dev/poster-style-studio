#!/usr/bin/env python3
"""Validate and package only the distributable skill directory."""
import argparse
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('Write the release ZIP outside the skill directory.')
    if output.exists():
        parser.error('Output already exists; choose another release filename.')
    subprocess.run([sys.executable, str(ROOT / 'scripts' / 'check_package.py')], check=True)
    subprocess.run(['node', '--test', *map(str, sorted((ROOT / 'tests').glob('*.test.cjs')))], cwd=ROOT, check=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(ROOT.rglob('*')):
            if not file.is_file() or any(part in ('.git', '__pycache__', '.DS_Store') for part in file.relative_to(ROOT).parts) or file.suffix in ('.pyc', '.zip'):
                continue
            archive.write(file, Path(ROOT.name) / file.relative_to(ROOT))
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise SystemExit('ZIP integrity check failed.')
        print(f'Packaged {len(archive.namelist())} files: {output}')


if __name__ == '__main__':
    main()
