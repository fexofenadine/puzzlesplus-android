#the same lost expert minesweeper board in all eight themes, maximised in 1280x640, for the banner's strips
#every glitch on and every background at its finest; each theme keeps the frame busiest in its own strip
#py -3 -I docs/banner/strips.py, from the repo's root with the dev server on localhost:5173
import json, os, random, sys
from PIL import Image, ImageChops, ImageFilter, ImageStat
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173/'
OUT = os.path.join('docs', 'banner', 'strips')
W, H, MINES = 30, 16, 99
#left to right as the banner has them (the title bar's font changes where two themes meet, so the monospace-title ones
#sit together at 2 and 3)
THEMES = ['terafox', 'vaporwave', 'classic', 'solarized', 'nord', 'solarized-phosphor',
          'synthwave', 'matrix']
SIZE = (1280, 640)
#every glitch on (signal drops are the only one off by default), finest background settings
EFFECTS = json.dumps({'drop': True})
BACKGROUNDS = json.dumps({'version': 2, 'neon': {'resolution': 100},
                          'driftclouds': {'animated': True, 'resolution': 100}, 'substrate': {'detail': 'sharp'}})
WAITS = {'terafox': 25000, 'nord': 12000, 'matrix': 20000}
#the shader's scene and the rain change a lot over time, so they get more tries
FRAMES = {'synthwave': 120, 'matrix': 80}
#the background must show as activity in the strip: the shader's neon or the rain at its liveliest, never a
#strip of black or the static wallpaper (a synthwave strip must show the shader's lines)
#and, where the strip falls over the window (matrix), rain seen through a see-through window
SETTINGS = {}
#the window's own opacity setting recolours the board, so a style makes the whole window see-through instead
#these are extra pictures, named <theme>-clear, taken beside the usual one for sheet.py to show
CLEAR = '[class*=Dialog_dialog] { opacity: 0.6 }'
VARIANTS = {'matrix-clear': 'matrix', 'nord-clear': 'nord', 'solarized-phosphor-clear': 'solarized-phosphor'}
BRIGHT = ('synthwave', 'matrix')
#names given on the command line retake only those themes
ONLY = sys.argv[1:]
#stitch.py's zoom about the window's middle
ZOOM, MIDDLE = 1.22, 306
INIT = """
if (window.WebGL2RenderingContext) WebGL2RenderingContext.prototype.readPixels = function () {}
//the root may not exist yet when this runs, and the shader reads the mark when it is made
const mark = () => document.documentElement && (document.documentElement.dataset.always = '')
if (!mark()) new MutationObserver((_, watch) => mark() && watch.disconnect()).observe(document, { childList: true })
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

def theme_of(k):
    return THEMES[k]


def busy(png, k):
    #how much edge strip k has, in the part of the screen stitch.py's zoom keeps for it
    full = Image.open(png).convert('RGB')
    im = full.convert('L')
    dpr = im.width / SIZE[0]
    a, b = k * SIZE[0] / len(THEMES), (k + 1) * SIZE[0] / len(THEMES)
    left, right = [((v - SIZE[0] / 2) / ZOOM + SIZE[0] / 2) * dpr for v in (a, b)]
    top, bottom = [((v - SIZE[1] / 2) / ZOOM + MIDDLE) * dpr for v in (0, SIZE[1])]
    part_box = (round(left), round(top), round(right), round(bottom))
    part = im.crop(part_box)
    if theme_of(k) in BRIGHT:
        #how much saturated light there is (neon lines, rain), so black strips and the grey haze of a
        #static burst both score low
        piece = full.crop(part_box)
        if theme_of(k) == 'matrix':
            #the rain is green: how much green beats red and blue (a glitch frame's blue board scores nothing)
            red, green, blue = piece.split()
            return ImageStat.Stat(ImageChops.subtract(green, ImageChops.lighter(red, blue))).mean[0]
        hsv = piece.convert('HSV')
        sat, val = hsv.getchannel('S'), hsv.getchannel('V')
        return ImageStat.Stat(ImageChops.multiply(sat, val)).mean[0]
    return ImageStat.Stat(part.filter(ImageFilter.FIND_EDGES)).mean[0]


os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.firefox.launch(firefox_user_prefs={'webgl.force-enabled': True, 'webgl.enable-webgl2': True})
    path = os.path.join(OUT, 'fields.json')
    fields = json.load(open(path)) if ONLY and os.path.exists(path) else {}
    jobs = [(name, name, False) for name in THEMES] + [(name, base, True) for name, base in VARIANTS.items()]
    for name, theme, clear in jobs:
        k = THEMES.index(theme)
        if ONLY and name not in ONLY: continue
        store = {'theme': theme, 'level': 'expert', 'savedGame': saved, 'maximised': 'yes',
                 'effects': EFFECTS, 'backgrounds': BACKGROUNDS,
                 **SETTINGS.get(theme, {})}
        c = b.new_context(viewport={'width': SIZE[0], 'height': SIZE[1]}, device_scale_factor=2)
        c.add_init_script('if (!sessionStorage.getItem("seeded")) {' +
                          ''.join(f'localStorage.setItem({json.dumps(k)}, {json.dumps(v)});' for k, v in store.items()) +
                          'sessionStorage.setItem("seeded", "1") }' + INIT)
        pg = c.new_page()
        pg.goto(BASE + 'minesweeper/')
        pg.wait_for_timeout(2500)
        if clear: pg.add_style_tag(content=CLEAR)
        pg.keyboard.press('p')
        pg.wait_for_timeout(300)
        box = pg.locator('[class*=Game_field]').first.bounding_box()
        x, y = lost
        pg.mouse.click(box['x'] + (x + 0.5) * box['width'] / W, box['y'] + (y + 0.5) * box['height'] / H)
        pg.mouse.move(2, 2)
        pg.wait_for_timeout(WAITS.get(theme, 6000))
        out = os.path.join(OUT, name + '.png')
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
        #the window's own box is what the slices line up on, since each theme's chrome is a little different
        fields[name] = {**pg.locator('[class*=Game_field]').first.bounding_box(),
                        'window': pg.locator('[class*=Dialog_dialog]').first.bounding_box()}
        print('took', name, 'lost' if pg.locator('[class*=fieldLost]').count() else 'NOT LOST', fields[name], round(score, 1))
        c.close()
    b.close()
with open(os.path.join(OUT, 'fields.json'), 'w') as f:
    json.dump(fields, f, indent=1)
