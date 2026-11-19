#stitches the nine theme pictures into one 1280x640 background, each theme an equal vertical strip
#each picture is shifted and scaled a hair so its minefield lands where the others' do
#py -3 -I docs/banner/stitch.py, from the repo's root after strips.py
import json, os
from PIL import Image

DIR = os.path.join('docs', 'banner')
#left to right, look-alike themes kept apart
THEMES = ['vaporwave', 'classic', 'solarized', 'terafox', 'nord', 'solarized-phosphor',
          'terafox-coral', 'synthwave', 'matrix']
SIZE = (1280, 640)

fields = json.load(open(os.path.join(DIR, 'strips', 'fields.json')))
#the average field is where every theme's goes
t = {key: sum(f[key] for f in fields.values()) / len(fields) for key in ('x', 'y', 'width', 'height')}
#then zoomed about the window so it fills the height and the taskbar drops below the edge
ZOOM, MIDDLE = 1.22, 306
t = {'x': (t['x'] - SIZE[0] / 2) * ZOOM + SIZE[0] / 2, 'y': (t['y'] - MIDDLE) * ZOOM + SIZE[1] / 2,
     'width': t['width'] * ZOOM, 'height': t['height'] * ZOOM}
out = Image.new('RGB', SIZE)
for k, theme in enumerate(THEMES):
    f = fields[theme]
    shot = Image.open(os.path.join(DIR, 'strips', theme + '.png')).convert('RGB')
    dpr = shot.width / SIZE[0]
    s = t['width'] / f['width']
    x0, y0 = f['x'] - t['x'] / s, f['y'] - t['y'] / s
    box = [round(v * dpr) for v in (x0, y0, x0 + SIZE[0] / s, y0 + SIZE[1] / s)]
    whole = shot.crop(box).resize(SIZE, Image.LANCZOS)
    a, b = round(k * SIZE[0] / len(THEMES)), round((k + 1) * SIZE[0] / len(THEMES))
    out.paste(whole.crop((a, 0, b, SIZE[1])), (a, 0))
out.save(os.path.join(DIR, 'stitched.png'))
print('wrote stitched.png')
