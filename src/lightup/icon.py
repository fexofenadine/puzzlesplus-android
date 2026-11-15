#draws the light up icons in public/lightup and the taskbar's src/shell/icons/lightup.png
#a 3x3 corner of a board: two walls, one numbered, and a bulb lighting its row and column
#run from the repo root: py -3 src/lightup/icon.py
from PIL import Image, ImageDraw

FACE = (192, 192, 192)
DARK = (224, 224, 224)
LIT = (255, 244, 150)
WALL = (64, 64, 64)
LINE = (128, 128, 128)
BULB = (255, 204, 0)
EDGE = (128, 96, 0)
INK = (255, 255, 255)

ONE = ['.#.', '##.', '.#.', '.#.', '###']

#w wall, 1 numbered wall, b bulb, l lit, d dark
CELLS = ['d', 'l', 'w', 'l', 'b', 'l', '1', 'l', 'd']


def draw(size, cell, scale):
    #cell pixels per cell, scale pixels per font pixel, the grid centred on the face
    image = Image.new('RGB', (size, size), FACE)
    pen = ImageDraw.Draw(image)
    grid = 3 * cell + 4
    left = (size - grid) // 2
    top = (size - grid) // 2
    pen.rectangle([left, top, left + grid - 1, top + grid - 1], fill=LINE)
    for k, kind in enumerate(CELLS):
        x = left + 1 + (k % 3) * (cell + 1)
        y = top + 1 + (k // 3) * (cell + 1)
        fill = WALL if kind in 'w1' else DARK if kind == 'd' else LIT
        pen.rectangle([x, y, x + cell - 1, y + cell - 1], fill=fill)
        if kind == 'b':
            pad = max(1, cell // 5)
            pen.ellipse([x + pad, y + pad, x + cell - 1 - pad, y + cell - 1 - pad], fill=BULB, outline=EDGE)
            if cell >= 9:
                pen.rectangle([x + pad + 2, y + pad + 2, x + pad + 2 + scale - 1, y + pad + 2 + scale - 1], fill=INK)
        if kind == '1' and scale:
            dx = x + (cell - 3 * scale) // 2
            dy = y + (cell - 5 * scale) // 2
            for row, bits in enumerate(ONE):
                for col, bit in enumerate(bits):
                    if bit == '#':
                        pen.rectangle(
                            [dx + col * scale, dy + row * scale,
                             dx + (col + 1) * scale - 1, dy + (row + 1) * scale - 1],
                            fill=INK,
                        )
    return image


def main():
    small = draw(16, 4, 0)
    icon = draw(32, 9, 1)
    large = draw(48, 14, 2)
    icon.save('src/shell/icons/lightup.png')
    icon.resize((192, 192), Image.NEAREST).save('public/lightup/icon.png')
    tile = Image.new('RGB', (558, 558), FACE)
    tile.paste(icon.resize((512, 512), Image.NEAREST), (23, 23))
    tile.save('public/lightup/tile.png')
    #the ico writer scales one image, so each size is saved from its own drawing
    large.save('public/lightup/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[icon, small])


if __name__ == '__main__':
    main()
