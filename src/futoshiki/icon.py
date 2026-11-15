#draws the futoshiki icons in public/futoshiki and the taskbar's src/shell/icons/futoshiki.png
#four cells apart with pixel digits, a less than sign between the top two and one on its side
#run from the repo root: py -3 src/futoshiki/icon.py
from PIL import Image, ImageDraw

FONT = {
    1: ['.#.', '##.', '.#.', '.#.', '###'],
    2: ['###', '..#', '###', '#..', '###'],
    3: ['###', '..#', '.##', '..#', '###'],
    4: ['#.#', '#.#', '###', '..#', '..#'],
}

FACE = (192, 192, 192)
CELL = (224, 224, 224)
LINE = (64, 64, 64)
GIVEN = (0, 0, 0)
INK = (0, 0, 192)
SIGN = (160, 0, 0)

#digit and colour per cell, row by row
DIGITS = [(1, GIVEN), (3, INK), (4, INK), (2, GIVEN)]


def draw(size, cell, gap, scale):
    #cell pixels per cell, gap pixels between cells, scale pixels per font pixel
    image = Image.new('RGB', (size, size), FACE)
    pen = ImageDraw.Draw(image)
    grid = 2 * cell + gap
    left = (size - grid) // 2
    top = (size - grid) // 2
    for k, (value, colour) in enumerate(DIGITS):
        x = left + (k % 2) * (cell + gap)
        y = top + (k // 2) * (cell + gap)
        pen.rectangle([x, y, x + cell - 1, y + cell - 1], fill=CELL, outline=LINE)
        if scale == 0:
            pen.rectangle([x + 2, y + 2, x + cell - 3, y + cell - 3], fill=colour)
            continue
        dx = x + (cell - 3 * scale) // 2
        dy = y + (cell - 5 * scale) // 2
        for row, bits in enumerate(FONT[value]):
            for col, bit in enumerate(bits):
                if bit == '#':
                    pen.rectangle(
                        [dx + col * scale, dy + row * scale,
                         dx + (col + 1) * scale - 1, dy + (row + 1) * scale - 1],
                        fill=colour,
                    )
    #1 < 3 across the top, and 1 < 4 down the left, each a small chevron in the gap
    half = max(1, gap // 2 - 1)
    cx = left + cell + gap // 2
    cy = top + cell // 2
    pen.line([cx + half - 1, cy - half, cx - half + 1, cy, cx + half - 1, cy + half], fill=SIGN, width=max(1, scale))
    cx = left + cell // 2
    cy = top + cell + gap // 2
    pen.line([cx - half, cy + half - 1, cx, cy - half + 1, cx + half, cy + half - 1], fill=SIGN, width=max(1, scale))
    return image


def main():
    small = draw(16, 6, 2, 0)
    icon = draw(32, 11, 6, 1)
    large = draw(48, 17, 8, 2)
    icon.save('src/shell/icons/futoshiki.png')
    icon.resize((192, 192), Image.NEAREST).save('public/futoshiki/icon.png')
    tile = Image.new('RGB', (558, 558), FACE)
    tile.paste(icon.resize((512, 512), Image.NEAREST), (23, 23))
    tile.save('public/futoshiki/tile.png')
    #the ico writer scales one image, so each size is saved from its own drawing
    large.save('public/futoshiki/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[icon, small])


if __name__ == '__main__':
    main()
