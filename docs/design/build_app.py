"""Собирает живые экраны карты: приложение GekkoFit из git-версии + оболочка app-harness.

Запуск из корня репозитория:  python docs/design/build_app.py [ref]     (по умолчанию origin/main)
Результат: docs/design/cabinet/app/ (index.html, app.js, app.css, картинки) - открывается с диска.
Нужны установленные зависимости в корне (npm ci).
"""
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'cabinet', 'app')
ref = sys.argv[1] if len(sys.argv) > 1 else 'origin/main'
sys.path.insert(0, HERE)
from states import STATES  # noqa: E402

work = tempfile.mkdtemp(prefix='gekko-app-')
archive = os.path.join(work, 'src.tar')
subprocess.run(['git', '-C', REPO, 'archive', '-o', archive, ref], check=True)
with tarfile.open(archive) as tar:
    tar.extractall(work, filter='data')
os.remove(archive)
commit = subprocess.run(['git', '-C', REPO, 'rev-parse', '--short', ref], check=True, capture_output=True, text=True).stdout.strip()

# одна база IndexedDB на экран карты: имя задаёт оболочка
schema = os.path.join(work, 'src', 'db', 'schema.ts')
text = open(schema, encoding='utf-8').read()
old = 'export const db = new AppDatabase()'
assert old in text, 'в schema.ts изменилось создание базы, поправьте build_app.py'
open(schema, 'w', encoding='utf-8').write(text.replace(old, "export const db = new AppDatabase((globalThis as { __GEKKO_DB__?: string }).__GEKKO_DB__ ?? 'WorkoutTrackerDB')"))

harness = os.path.join(work, 'harness')
shutil.copytree(os.path.join(HERE, 'app-harness'), harness)
json.dump(STATES, open(os.path.join(harness, 'states.json'), 'w', encoding='utf-8'), ensure_ascii=False)
shutil.copy(os.path.join(HERE, 'capture', 'demo-backup.json'), os.path.join(harness, 'demo-backup.json'))

link = os.path.join(work, 'node_modules')
subprocess.run(['cmd', '/c', 'mklink', '/J', link, os.path.join(REPO, 'node_modules')], check=True, capture_output=True) if os.name == 'nt' \
    else os.symlink(os.path.join(REPO, 'node_modules'), link)

env = dict(os.environ, HARNESS_OUT=OUT)
vite = os.path.join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')
subprocess.run(['node', vite, 'build', '--config', os.path.join('harness', 'vite.harness.config.ts'), '--logLevel', 'warn'], cwd=work, env=env, check=True)

css = os.path.join(OUT, 'app.css')
js = os.path.join(OUT, 'app.js')
style = open(css, encoding='utf-8').read()
for before, after in (('url(../', 'url(./'), ("url('/", "url('./"), ('url("/', 'url("./'), ('url(/', 'url(./')):
    style = style.replace(before, after)
script = open(js, encoding='utf-8').read()

# тяжёлые PNG из public -> WebP, ссылки в app.js и app.css меняются на .webp
from PIL import Image  # noqa: E402
for root, _, names in os.walk(OUT):
    for name in names:
        path = os.path.join(root, name)
        if not name.endswith('.png') or os.path.getsize(path) < 150_000:
            continue
        image = Image.open(path)
        if image.width > 900 and 'exercises' in root:
            image = image.resize((640, round(image.height * 640 / image.width)), Image.LANCZOS)
        image.save(path[:-4] + '.webp', 'WEBP', quality=82, method=6)
        os.remove(path)
        style = style.replace(name, name[:-4] + '.webp')
        script = script.replace(name, name[:-4] + '.webp')
open(css, 'w', encoding='utf-8').write(style)
open(js, 'w', encoding='utf-8').write(script)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8', newline='\n').write(
    '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    f'<title>GekkoFit · живой экран</title>\n<!-- Собрано docs/design/build_app.py из {ref} ({commit}). -->\n'
    '<link rel="stylesheet" href="app.css">\n</head>\n<body>\n<div id="root"></div>\n<script src="app.js"></script>\n</body>\n</html>\n')
open(os.path.join(OUT, 'version.json'), 'w', encoding='utf-8').write(json.dumps({'ref': ref, 'commit': commit}))
json.dump(STATES, open(os.path.join(OUT, 'states.json'), 'w', encoding='utf-8'), ensure_ascii=False)

if os.name == 'nt':
    os.rmdir(link)  # снять junction, не трогая node_modules репозитория
else:
    os.unlink(link)
shutil.rmtree(work, ignore_errors=True)
size = sum(os.path.getsize(os.path.join(root, name)) for root, _, names in os.walk(OUT) for name in names)
print(f'живые экраны: {ref} ({commit}), {len(STATES)} состояний, {size // 1024} КБ')
