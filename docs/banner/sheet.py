#a contact sheet of every theme's picture as stitch.py frames it, a divider at each eighth and the slice
#numbers beneath, to choose which theme's slice goes where (the see-through variants come after the themes)
#py -3 -I docs/banner/sheet.py, from the repo's root after strips.py; writes docs/banner/sheet.jpg
import json, os
from PIL import Image, ImageDraw

DIR = os.path.join('docs', 'banner')
#left to right as stitch.py has them
THEMES = ['vaporwave', 'solarized', 'terafox', 'classic', 'nord', 'solarized-phosphor',
          'matrix', 'synthwave']
EXTRA = ['matrix-clear', 'nord-clear', 'solarized-phosphor-clear']
SIZE = (1280, 640)

fields = json.load(open(os.path.join(DIR, 'strips', 'fields.json')))
frame = lambda name: fields[name].get('window') or fields[name]
t = {key: sum(frame(n)[key] for n in THEMES) / len(THEMES) for key in ('x', 'y', 'width', 'height')}
ZOOM, MIDDLE = 1.22, 306
t = {'x': (t['x'] - SIZE[0] / 2) * ZOOM + SIZE[0] / 2, 'y': (t['y'] - MIDDLE) * ZOOM + SIZE[1] / 2,
     'width': t['width'] * ZOOM, 'height': t['height'] * ZOOM}

names = [n for n in THEMES + EXTRA if n in fields]
half = (SIZE[0] // 2, SIZE[1] // 2)
rows = (len(names) + 1) // 2
sheet = Image.new('RGB', (half[0] * 2 + 30, (half[1] + 30) * rows + 10), (24, 24, 24))
draw = ImageDraw.Draw(sheet)
for k, name in enumerate(names):
    f = frame(name)
    shot = Image.open(os.path.join(DIR, 'strips', name + '.png')).convert('RGB')
    dpr = shot.width / SIZE[0]
    s = t['width'] / f['width']
    x0, y0 = f['x'] - t['x'] / s, f['y'] - t['y'] / s
    box = [round(v * dpr) for v in (x0, y0, x0 + SIZE[0] / s, y0 + SIZE[1] / s)]
    whole = shot.crop(box).resize(half, Image.LANCZOS)
    x, y = 10 + (k % 2) * (half[0] + 10), 10 + (k // 2) * (half[1] + 30)
    sheet.paste(whole, (x, y))
    for n in range(9):
        dx = min(x + round(n * half[0] / 8), x + half[0] - 1)
        draw.line([(dx, y), (dx, y + half[1])], fill=(255, 255, 255), width=1)
    for n in range(8):
        draw.text((x + round((n + 0.5) * half[0] / 8) - 3, y + half[1] + 4), str(n + 1), fill=(200, 200, 200))
    draw.text((x + 4, y + half[1] + 16), name, fill=(255, 255, 255))
sheet.save(os.path.join(DIR, 'sheet.jpg'), quality=88)
print('wrote sheet.jpg', sheet.size)
