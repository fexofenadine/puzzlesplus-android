#draws the puzzles plus icon: a raised grey jigsaw piece with a raised navy plus on windows 95 teal
#writes the site's icons, readme header and social preview; with --android <res folder> also the
#app's launcher icons and splash screens. needs python with pillow and numpy
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

N = 768
TEAL = (0, 128, 128)
SHADOW_TEAL = (0, 64, 64)
GREY = (192, 192, 192)
LIGHT = (255, 255, 255)
SHADOW = (128, 128, 128)
DARK = (64, 64, 64)
NAVY = (10, 36, 106)


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


#the plus clockwise, a little above the piece's middle so it looks centred between knob and notch
def plus_outline(cx=400, cy=362, a=158, h=62):
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


#the icon at N pixels; without a background the teal is left transparent, for android's foreground
def draw(background=True):
    im = Image.new('RGBA', (N, N), TEAL + (255,) if background else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    outline = piece_outline()
    d.polygon([(x + 18, y + 18) for x, y in outline], fill=SHADOW_TEAL + (255,))
    d.polygon(outline, fill=GREY + (255,))
    px = np.array(im)
    bands = [(10, LIGHT + (255,), DARK + (255,)), (7, (223, 223, 223, 255), SHADOW + (255,))]
    bevel_by_distance(px, outline, bands)
    im = Image.fromarray(px)
    d = ImageDraw.Draw(im)
    plus = plus_outline()
    d.polygon(plus, fill=NAVY + (255,))
    inner = band(d, plus, 12, LIGHT + (255,), (20, 20, 20, 255))
    band(d, inner, 7, (70, 104, 196, 255), (4, 16, 56, 255))
    return im


def sized(im, size):
    return im.resize((size, size), Image.LANCZOS)


def site(root, icon):
    public = root / 'public'
    sized(icon, 192).save(public / 'icon.png')
    sized(icon, 512).save(public / 'icon-512.png')
    sized(icon, 48).save(public / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    sized(icon, 160).save(root / 'docs' / 'puzzlesplus.png')
    #github's social preview, 1280x640: the icon and the name on the teal desktop
    preview = Image.new('RGB', (1280, 640), TEAL)
    preview.paste(sized(icon, 400), (110, 120), sized(icon, 400))
    d = ImageDraw.Draw(preview)
    font = ImageFont.truetype('arialbd.ttf', 96)
    small = ImageFont.truetype('arial.ttf', 40)
    d.text((560, 220), 'Puzzles Plus', fill=LIGHT, font=font)
    d.text((564, 350), 'Minesweeper, Takuzu and Nonograms', fill=(200, 230, 230), font=small)
    d.text((564, 405), 'Windows style, with hints that explain', fill=(200, 230, 230), font=small)
    preview.save(root / 'docs' / 'social-preview.png')


#launcher icons per density: the adaptive foreground within the 66dp safe circle of its 108dp
#canvas over a teal background, and legacy square and round icons; splashes keep the icon small
def android(res, icon):
    fg = draw(background=False)
    box = fg.getbbox()
    content = fg.crop(box)
    densities = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
    for name, scale in densities.items():
        canvas = round(108 * scale)
        layer = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
        side = round(52 * scale)
        piece = content.resize((side, round(side * content.height / content.width)), Image.LANCZOS)
        layer.paste(piece, ((canvas - piece.width) // 2, (canvas - piece.height) // 2), piece)
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
        splash = Image.new('RGB', (w, h), TEAL)
        side = round(min(w, h) * 0.32)
        piece = content.resize((side, round(side * content.height / content.width)), Image.LANCZOS)
        splash.paste(piece, ((w - piece.width) // 2, (h - piece.height) // 2), piece)
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
