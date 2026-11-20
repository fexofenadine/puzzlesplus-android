#stitches the eight theme pictures into one 1280x640 background, each theme an equal vertical strip
#each picture is shifted and scaled a hair so its minefield lands where the others' do
#py -3 -I docs/banner/stitch.py, from the repo's root after strips.py
import json, os
from PIL import Image

DIR = os.path.join('docs', 'banner')
#left to right, look-alike themes kept apart
THEMES = ['terafox', 'vaporwave', 'classic', 'solarized', 'nord', 'solarized-phosphor',
          'synthwave', 'matrix']
SIZE = (1280, 640)
#rows (in the finished picture) cut from a theme whose title and menu bars run taller than the rest
CUT = {'nord': [35, 36, 70, 71]}

fields = json.load(open(os.path.join(DIR, 'strips', 'fields.json')))
#each theme's window (its chrome differs a little, so the window is what lines up, not the minefield)
#the average window is where every theme's goes
frame = lambda name: fields[name].get('window') or fields[name]
t = {key: sum(frame(n)[key] for n in THEMES) / len(THEMES) for key in ('x', 'y', 'width', 'height')}
#then zoomed about the window so it fills the height and the taskbar drops below the edge
ZOOM, MIDDLE = 1.22, 306
t = {'x': (t['x'] - SIZE[0] / 2) * ZOOM + SIZE[0] / 2, 'y': (t['y'] - MIDDLE) * ZOOM + SIZE[1] / 2,
     'width': t['width'] * ZOOM, 'height': t['height'] * ZOOM}
out = Image.new('RGB', SIZE)
for k, theme in enumerate(THEMES):
    f = frame(theme)
    shot = Image.open(os.path.join(DIR, 'strips', theme + '.png')).convert('RGB')
    dpr = shot.width / SIZE[0]
    s = t['width'] / f['width']
    cut = CUT.get(theme, [])
    high = SIZE[1] + len(cut)
    x0, y0 = f['x'] - t['x'] / s, f['y'] - t['y'] / s
    box = [round(v * dpr) for v in (x0, y0, x0 + SIZE[0] / s, y0 + high / s)]
    whole = shot.crop(box).resize((SIZE[0], high), Image.LANCZOS)
    if cut:
        keep = [r for r in range(high) if r not in cut]
        whole = Image.merge('RGB', [Image.fromarray(__import__('numpy').array(c)[keep]) for c in whole.split()]).crop((0, 0, SIZE[0], SIZE[1]))
    a, b = round(k * SIZE[0] / len(THEMES)), round((k + 1) * SIZE[0] / len(THEMES))
    out.paste(whole.crop((a, 0, b, SIZE[1])), (a, 0))
out.save(os.path.join(DIR, 'stitched.png'))
print('wrote stitched.png')
