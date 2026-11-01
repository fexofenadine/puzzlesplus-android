#draws the puzzles plus icon: a raised jigsaw piece with a raised plus, in the nord colours
#writes the site's icons, readme header and social preview; with --android <res folder> also the
#app's launcher icons and splash screens. needs python with pillow and numpy
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

N = 768
#nord, no white: a frost blue piece with a light frost plus on polar night slate
NIGHT = (46, 52, 64)
SNOW = (216, 222, 233)
BACKGROUND = (76, 86, 106)
PIECE = (94, 129, 172)
PLUS = (136, 192, 208)
LIGHT = (236, 239, 244)
FROST = (136, 192, 208)


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


#a raised bevel from the fill itself, lightened toward snow storm and darkened toward polar night
def bands(fill, outer):
    return [
        (outer, mix(fill, SNOW, 0.5), mix(fill, NIGHT, 0.6)),
        (7, mix(fill, SNOW, 0.25), mix(fill, NIGHT, 0.3)),
    ]


DROP_SHADOW = mix(BACKGROUND, (0, 0, 0), 0.35)
PIECE_BANDS = bands(PIECE, 10)
PLUS_BANDS = bands(PLUS, 12)


#an arc from p to q around centre, the way round that passes the angle via (radians, y down)
def arc(centre, r, p, q, via, steps=48):
    cx, cy = centre
    a0 = np.arctan2(p[1] - cy, p[0] - cx)
    a1 = np.arctan2(q[1] - cy, q[0] - cx)
    for sweep in ((a1 - a0) % (2 * np.pi), (a1 - a0) % (2 * np.pi) - 2 * np.pi):
        if np.cos(a0 + sweep / 2 - via) > 0:
            return [
                (cx + r * np.cos(a0 + sweep * t / steps), cy + r * np.sin(a0 + sweep * t / steps))
                for t in range(1, steps)
            ]


#the piece clockwise (y down): a knob out of the top and right, a notch into the left and bottom
def piece_outline(a=150, b=620, r=62):
    c = (a + b) / 2
    k = r * np.sqrt(1 - 0.55**2)
    k2 = r * np.sqrt(1 - 0.5**2)
    up, right = -np.pi / 2, 0
    pts = [(a, a), (c - k, a)]
    pts += arc((c, a - 0.55 * r), r, (c - k, a), (c + k, a), up)
    pts += [(c + k, a), (b, a), (b, c - k)]
    pts += arc((b + 0.55 * r, c), r, (b, c - k), (b, c + k), right)
    pts += [(b, c + k), (b, b), (c + k2, b)]
    pts += arc((c, b - 0.5 * r), r, (c + k2, b), (c - k2, b), up)
    pts += [(c - k2, b), (a, b), (a, c + k2)]
    pts += arc((a + 0.5 * r, c), r, (a, c + k2), (a, c - k2), right)
    pts += [(a, c - k2)]
    return pts


#the plus clockwise, a little up and right of the piece's middle so it sits evenly between the knobs
#and notches, its arms stopping 8px short of the notches' 17px bevels
def plus_outline(cx=408, cy=362, a=150, h=62):
    return [
        (cx - h, cy - a), (cx + h, cy - a), (cx + h, cy - h), (cx + a, cy - h), (cx + a, cy + h),
        (cx + h, cy + h), (cx + h, cy + a), (cx - h, cy + a), (cx - h, cy + h), (cx - a, cy + h),
        (cx - a, cy - h), (cx - h, cy - h),
    ]


#a square-cornered outline moved inwards by w, each corner mitred at 45 degrees
def inset(points, w):
    n = len(points)
    normals = []
    for i in range(n):
        (x0, y0), (x1, y1) = points[i], points[(i + 1) % n]
        normals.append((-np.sign(y1 - y0), np.sign(x1 - x0)))
    return [
        (x + w * (normals[i - 1][0] + normals[i][0]), y + w * (normals[i - 1][1] + normals[i][1]))
        for i, (x, y) in enumerate(points)
    ]


#one band of a square-cornered bevel: each edge's strip light facing up or left, dark otherwise
def band(d, outer, w, light, dark):
    inner = inset(outer, w)
    n = len(outer)
    for i in range(n):
        (x0, y0), (x1, y1) = outer[i], outer[(i + 1) % n]
        lit = x1 > x0 or y1 < y0
        quad = [outer[i], outer[(i + 1) % n], inner[(i + 1) % n], inner[i]]
        d.polygon(quad, fill=light if lit else dark)
    return inner


#a curved outline's bevel: each pixel near the edge takes the band its distance falls in, light or
#dark by the way its nearest edge faces, so corners mitre cleanly and sharp inside corners round off
def bevel_by_distance(px, outline, bands):
    pts = np.array(outline + [outline[0]], dtype=float)
    samples, normals = [], []
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        length = np.hypot(x1 - x0, y1 - y0)
        if not length:
            continue
        steps = max(1, int(length * 2))
        t = np.arange(steps) / steps
        samples.append(np.stack([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t], 1))
        normals.append(np.tile([(y1 - y0) / length, -(x1 - x0) / length], (steps, 1)))
    samples, normals = np.concatenate(samples), np.concatenate(normals)
    mask = Image.new('L', (N, N), 0)
    ImageDraw.Draw(mask).polygon(outline, fill=255)
    ys, xs = np.nonzero(np.array(mask))
    for i in range(0, len(xs), 2048):
        x, y = xs[i : i + 2048], ys[i : i + 2048]
        d2 = (x[:, None] + 0.5 - samples[None, :, 0]) ** 2 + (y[:, None] + 0.5 - samples[None, :, 1]) ** 2
        near = d2.argmin(1)
        dist = np.sqrt(d2[np.arange(len(x)), near])
        lit = (normals[near, 0] + normals[near, 1]) < 0
        edge = 0
        for w, light, dark in bands:
            sel = (dist >= edge) & (dist < edge + w)
            px[y[sel], x[sel]] = np.where(lit[sel, None], light, dark)
            edge += w


#the middle of a shape's area; the knobs and notches pull it off the square's middle
#the smallest circle round some points, (x, y, radius): randomised incremental, as in welzl's
def enclosing_circle(points, seed=0):
    def two(p, q):
        return ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, np.hypot(p[0] - q[0], p[1] - q[1]) / 2)

    def three(p, q, r):
        ax, ay = p
        bx, by = q
        cx, cy = r
        d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
        if abs(d) < 1e-9:
            return max((two(p, q), two(q, r), two(p, r)), key=lambda c: c[2])
        ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
        uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
        return (ux, uy, np.hypot(ax - ux, ay - uy))

    def inside(c, p):
        return c is not None and np.hypot(p[0] - c[0], p[1] - c[1]) <= c[2] + 1e-6

    pts = list(points)
    np.random.default_rng(seed).shuffle(pts)
    c = None
    for i, p in enumerate(pts):
        if inside(c, p):
            continue
        c = (p[0], p[1], 0)
        for j, q in enumerate(pts[:i]):
            if inside(c, q):
                continue
            c = two(p, q)
            for r in pts[:j]:
                if not inside(c, r):
                    c = three(p, q, r)
    return c


#the icon at N pixels; without a background it is left transparent, for android's foreground
#the piece is centred on the smallest circle round it, so in a round mask the square's corners
#and the knobs clear the edge alike; its centre of mass had sat it low and left
def draw(background=True):
    im = Image.new('RGBA', (N, N), BACKGROUND + (255,) if background else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    outline = piece_outline()
    cx, cy, _ = enclosing_circle(outline)
    dx, dy = N / 2 - cx, N / 2 - cy
    outline = [(x + dx, y + dy) for x, y in outline]
    d.polygon([(x + 18, y + 18) for x, y in outline], fill=DROP_SHADOW + (255,))
    d.polygon(outline, fill=PIECE + (255,))
    px = np.array(im)
    bevel_by_distance(px, outline, [(w, lit + (255,), dark + (255,)) for w, lit, dark in PIECE_BANDS])
    im = Image.fromarray(px)
    d = ImageDraw.Draw(im)
    plus = [(x + dx, y + dy) for x, y in plus_outline()]
    d.polygon(plus, fill=PLUS + (255,))
    inner = plus
    for w, lit, dark in PLUS_BANDS:
        inner = band(d, inner, w, lit + (255,), dark + (255,))
    return im


def sized(im, size):
    return im.resize((size, size), Image.LANCZOS)


def site(root, icon):
    public = root / 'public'
    sized(icon, 192).save(public / 'icon.png')
    sized(icon, 512).save(public / 'icon-512.png')
    sized(icon, 48).save(public / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    sized(icon, 160).save(root / 'docs' / 'puzzlesplus.png')
    #github's social preview, 1280x640: the icon and the name on polar night
    preview = Image.new('RGB', (1280, 640), BACKGROUND)
    preview.paste(sized(icon, 400), (110, 120), sized(icon, 400))
    d = ImageDraw.Draw(preview)
    font = ImageFont.truetype('arialbd.ttf', 96)
    small = ImageFont.truetype('arial.ttf', 40)
    d.text((560, 220), 'Puzzles Plus', fill=LIGHT, font=font)
    d.text((564, 350), 'Minesweeper, Takuzu and Nonograms', fill=FROST, font=small)
    d.text((564, 405), 'Windows style, with hints that explain', fill=FROST, font=small)
    preview.save(root / 'docs' / 'social-preview.png')


#launcher icons per density: the adaptive foreground with the piece's circle 31dp across the 33dp
#safe radius of its 108dp canvas, over the background colour, and legacy square and round icons;
#splashes keep the icon small
def android(res, icon):
    fg = draw(background=False)
    radius = enclosing_circle(piece_outline())[2]
    densities = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
    for name, scale in densities.items():
        canvas = round(108 * scale)
        layer = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
        whole = sized(fg, round(N * 31 * scale / radius))
        layer.paste(whole, ((canvas - whole.width) // 2, (canvas - whole.height) // 2), whole)
        layer.save(res / f'mipmap-{name}' / 'ic_launcher_foreground.png')
        legacy = round(48 * scale)
        sized(icon, legacy).convert('RGB').save(res / f'mipmap-{name}' / 'ic_launcher.png')
        mask = Image.new('L', (legacy * 4, legacy * 4), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, legacy * 4 - 1, legacy * 4 - 1], fill=255)
        round_icon = Image.new('RGBA', (legacy, legacy), (0, 0, 0, 0))
        round_icon.paste(sized(icon, legacy), (0, 0), mask.resize((legacy, legacy), Image.LANCZOS))
        round_icon.save(res / f'mipmap-{name}' / 'ic_launcher_round.png')
    for path in res.glob('drawable*/splash.png'):
        w, h = Image.open(path).size
        splash = Image.new('RGB', (w, h), BACKGROUND)
        whole = sized(fg, round(N * min(w, h) * 0.18 / radius))
        splash.paste(whole, ((w - whole.width) // 2, (h - whole.height) // 2), whole)
        splash.save(path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--android', type=Path, help='the android res folder to fill as well')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    icon = draw()
    site(root, icon)
    if args.android:
        android(args.android, icon)
