#draws vaporwave's wallpaper, src/vaporwave.webp: a pastel day over a checkerboard floor
#an original picture, so it needs no licence or credit; needs python with pillow and numpy
#run from the project's top: py -3 src/shell/backgrounds/pastel.py
import numpy as np
from PIL import Image, ImageDraw

W, H, S = 3840, 2160, 2
w, h = W * S, H * S


def rgb(c):
    return np.array([int(c[k : k + 2], 16) for k in (1, 3, 5)], dtype=np.float32)


#colour stops down a 0 to 1 run
def ramp(stops, t):
    res = np.zeros(t.shape + (3,), dtype=np.float32)
    for (a0, c0), (a1, c1) in zip(stops, stops[1:]):
        m = (t >= a0) & (t <= a1)
        k = ((t - a0) / max(a1 - a0, 1e-6))[..., None]
        res = np.where(m[..., None], rgb(c0) * (1 - k) + rgb(c1) * k, res)
    return res


ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
horizon = 0.62 * h

#cyan to pink sky with a pale sun
img = ramp([(0, '#8fe3ff'), (0.6, '#d9c4ff'), (1, '#ffb3e2')], np.clip(ys / horizon, 0, 1))
cx, cy, r = w * 0.5, horizon - 0.2 * h, 0.17 * h
d = np.hypot(xs - cx, ys - cy)
sun = ramp([(0, '#fffbd0'), (1, '#ffd0ea')], np.clip((ys - (cy - r)) / (2 * r), 0, 1))
glow = np.clip(1 - (d - r) / (0.7 * r), 0, 1)[..., None] ** 2 * 0.5
img = img + (rgb('#ffffff') - img) * glow
img = np.where((d < r)[..., None], sun, img)

#the floor: squares in perspective, fading into haze at the horizon
depth = np.clip((ys - horizon) / (h - horizon), 1e-4, 1)
z = 1 / depth
check = ((np.floor((xs - cx) / w * z * 7) + np.floor(z * 1.6)) % 2).astype(bool)
floor = np.where(check[..., None], rgb('#ff8fd0'), rgb('#fff0fa'))
haze = np.clip(1 - depth * 3.5, 0, 1)[..., None]
floor = floor + (rgb('#ffb3e2') - floor) * haze
img = np.where((ys >= horizon)[..., None], floor, img)

pic = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
draw = ImageDraw.Draw(pic, 'RGBA')

#a mint sphere over its shadow
x, y, rad, mint = w * 0.2, h * 0.5, h * 0.09, (5, 255, 161)
draw.ellipse([x - rad * 1.1, h * 0.9 - rad * 0.2, x + rad * 1.1, h * 0.9 + rad * 0.2], fill=(120, 60, 140, 60))
for k in range(40, 0, -1):
    t = k / 40
    shade = tuple(int(mint[i] + (255 - mint[i]) * (1 - t) ** 2 * 0.9) for i in range(3))
    ox, oy = rad * 0.3 * (1 - t), rad * 0.35 * (1 - t)
    draw.ellipse([x - rad * t - ox, y - rad * t - oy, x + rad * t - ox, y + rad * t - oy], fill=shade + (255,))

#a purple pyramid
px, py, ps = w * 0.8, h * 0.74, h * 0.2
draw.polygon([(px, py - ps), (px - ps * 0.7, py), (px + ps * 0.1, py + ps * 0.12)], fill=(185, 103, 255, 255))
draw.polygon([(px, py - ps), (px + ps * 0.1, py + ps * 0.12), (px + ps * 0.75, py - ps * 0.05)], fill=(140, 70, 215, 255))

pic.resize((W, H), Image.LANCZOS).save('src/vaporwave.webp', quality=80, method=6)
