#!/usr/bin/env python3
"""Package the experimental Python Windows source without local logs or a venv."""
from pathlib import Path
import hashlib
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / 'Dibbur-Windows-prototype-v0.1.0.zip'
out.parent.mkdir(parents=True, exist_ok=True)
base = root / 'windows-prototype'
allowed = ['README.md', 'README.txt', 'SOURCE.md', 'config.json', 'create_shortcuts.ps1',
           'dictation.py', 'install.bat', 'requirements.txt', 'tests/test_prototype.py']
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in allowed:
        data = (base / name).read_bytes()
        if name == 'SOURCE.md':
            data = data.replace(b'../LICENSE', b'LICENSE')
        if name == 'README.md':
            data = data.replace(b'discover -s windows-prototype/tests', b'discover -s tests')
        info = zipfile.ZipInfo('Dibbur-Windows/' + name, date_time=(2026, 11, 15, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, data)
    info = zipfile.ZipInfo('Dibbur-Windows/LICENSE', date_time=(2026, 11, 15, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    z.writestr(info, (root / 'LICENSE').read_bytes())
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
checksum = hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix('.zip.sha256').write_text(checksum + '  ' + out.name + '\n')
print(str(out), checksum)
