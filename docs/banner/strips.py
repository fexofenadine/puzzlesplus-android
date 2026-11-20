#the same lost expert minesweeper board in all eight themes, maximised in 1280x640, for the banner's strips
#every glitch on and every background at its finest; each theme keeps the frame busiest in its own strip
#py -3 -I docs/banner/strips.py, from the repo's root with the dev server on localhost:5173
import json, os, random, sys
from PIL import Image, ImageFilter, ImageStat
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173/'
OUT = os.path.join('docs', 'banner', 'strips')
W, H, MINES = 30, 16, 99
#left to right as the banner has them
THEMES = ['vaporwave', 'classic', 'solarized', 'terafox', 'nord', 'solarized-phosphor',
          'synthwave', 'matrix']
SIZE = (1280, 640)
#every glitch on (signal drops are the only one off by default), finest background settings
EFFECTS = json.dumps({'drop': True})
BACKGROUNDS = json.dumps({'version': 2, 'neon': {'resolution': 100},
                          'driftclouds': {'animated': True, 'resolution': 100}, 'substrate': {'detail': 'sharp'}})
WAITS = {'terafox': 25000, 'nord': 12000, 'matrix': 20000}
#the shader's scene and the rain change a lot over time, so they get more tries
FRAMES = {'synthwave': 60, 'matrix': 80}
#names given on the command line retake only those themes
ONLY = sys.argv[1:]
#stitch.py's zoom about the window's middle
ZOOM, MIDDLE = 1.22, 306
INIT = """
document.documentElement.dataset.always = ''
if (window.WebGL2RenderingContext) WebGL2RenderingContext.prototype.readPixels = function () {}
"""


def around(x, y):
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if (dx or dy) and 0 <= x + dx < W and 0 <= y + dy < H:
                yield x + dx, y + dy


def deal(seed):
    #mines away from the start, then the opening and whatever plain logic finds from it
    rng = random.Random(seed)
    sx, sy = W // 2, H // 2
    free = {(sx, sy), *around(sx, sy)}
    spots = [(x, y) for y in range(H) for x in range(W) if (x, y) not in free]
    mined = set(rng.sample(spots, MINES))
    num = {(x, y): sum(p in mined for p in around(x, y)) for y in range(H) for x in range(W)}
    opened, flags = set(), set()

    def open_(x, y):
        stack = [(x, y)]
        while stack:
            p = stack.pop()
            if p in opened or p in flags: continue
            opened.add(p)
            if num[p] == 0: stack.extend(around(*p))

    open_(sx, sy)
    moved = True
    while moved:
        moved = False
        for p in list(opened):
            hidden = [q for q in around(*p) if q not in opened and q not in flags]
            flagged = sum(q in flags for q in around(*p))
            if not hidden: continue
            if num[p] == flagged:
                for q in hidden: open_(*q)
                moved = True
            elif num[p] == flagged + len(hidden):
                flags.update(hidden)
                moved = True
    return mined, num, opened, flags


def best():
    #a seed whose plain logic stalls about two thirds of the way, so the board is mostly played
    return min(range(300), key=lambda s: abs(len(deal(s)[2]) - 0.65 * (W * H - MINES)))


seed = best()
mined, num, opened, flags = deal(seed)
#the losing click: a hidden mine on the edge of the opened ground, near the middle
edge = [p for p in mined if p not in flags and any(q in opened for q in around(*p))]
lost = min(edge, key=lambda p: abs(p[0] - W * 0.62) + abs(p[1] - H * 0.5) * 2)
print('seed', seed, 'opened', len(opened), 'flags', len(flags), 'lost at', lost)

field = [[num[(x, y)] | (16 if (x, y) in opened else 0) | (32 if (x, y) in mined else 0) |
          (64 if (x, y) in flags else 0) for x in range(W)] for y in range(H)]
game = {'level': 'expert', 'width': W, 'height': H, 'mines': MINES, 'field': field,
        'left': W * H - MINES - len(opened), 'flags': len(flags), 'hinted': False, 'untimed': False}
saved = json.dumps({'version': 1, 'elapsed': 271400, 'game': game})

def busy(png, k):
    #how much edge strip k has, in the part of the screen stitch.py's zoom keeps for it
    im = Image.open(png).convert('L')
    dpr = im.width / SIZE[0]
    a, b = k * SIZE[0] / len(THEMES), (k + 1) * SIZE[0] / len(THEMES)
    left, right = [((v - SIZE[0] / 2) / ZOOM + SIZE[0] / 2) * dpr for v in (a, b)]
    top, bottom = [((v - SIZE[1] / 2) / ZOOM + MIDDLE) * dpr for v in (0, SIZE[1])]
    part = im.crop((round(left), round(top), round(right), round(bottom)))
    return ImageStat.Stat(part.filter(ImageFilter.FIND_EDGES)).mean[0]


os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.firefox.launch(firefox_user_prefs={'webgl.force-enabled': True, 'webgl.enable-webgl2': True})
    path = os.path.join(OUT, 'fields.json')
    fields = json.load(open(path)) if ONLY and os.path.exists(path) else {}
    for k, theme in enumerate(THEMES):
        if ONLY and theme not in ONLY: continue
        store = {'theme': theme, 'level': 'expert', 'savedGame': saved, 'maximised': 'yes',
                 'effects': EFFECTS, 'backgrounds': BACKGROUNDS}
        c = b.new_context(viewport={'width': SIZE[0], 'height': SIZE[1]}, device_scale_factor=2)
        c.add_init_script('if (!sessionStorage.getItem("seeded")) {' +
                          ''.join(f'localStorage.setItem({json.dumps(k)}, {json.dumps(v)});' for k, v in store.items()) +
                          'sessionStorage.setItem("seeded", "1") }' + INIT)
        pg = c.new_page()
        pg.goto(BASE + 'minesweeper/')
        pg.wait_for_timeout(2500)
        pg.keyboard.press('p')
        pg.wait_for_timeout(300)
        box = pg.locator('[class*=Game_field]').first.bounding_box()
        x, y = lost
        pg.mouse.click(box['x'] + (x + 0.5) * box['width'] / W, box['y'] + (y + 0.5) * box['height'] / H)
        pg.mouse.move(2, 2)
        pg.wait_for_timeout(WAITS.get(theme, 6000))
        out = os.path.join(OUT, theme + '.png')
        score = -1
        for n in range(FRAMES.get(theme, 6)):
            tmp = os.path.join(OUT, '_frame.png')
            pg.screenshot(path=tmp)
            now = busy(tmp, k)
            if now > score:
                score = now
                os.replace(tmp, out)
            pg.wait_for_timeout(500)
        if os.path.exists(tmp): os.remove(tmp)
        fields[theme] = pg.locator('[class*=Game_field]').first.bounding_box()
        print('took', theme, 'lost' if pg.locator('[class*=fieldLost]').count() else 'NOT LOST', fields[theme], round(score, 1))
        c.close()
    b.close()
with open(os.path.join(OUT, 'fields.json'), 'w') as f:
    json.dump(fields, f, indent=1)
