#draws the sudoku icons in public/sudoku and the taskbar's src/shell/icons/sudoku.png
#one 3x3 box of flat cells with pixel digits, givens in black and a player's digit in blue
#run from the repo root: py -3 src/sudoku/icon.py
from PIL import Image, ImageDraw

FONT = {
    1: ['.#.', '##.', '.#.', '.#.', '###'],
    3: ['###', '..#', '.##', '..#', '###'],
    5: ['###', '#..', '###', '..#', '###'],
    7: ['###', '..#', '.#.', '.#.', '.#.'],
    9: ['###', '#.#', '###', '..#', '###'],
}

FACE = (192, 192, 192)
CELL = (224, 224, 224)
LINE = (64, 64, 64)
GIVEN = (0, 0, 0)
INK = (0, 0, 192)

#digit and colour per cell, row by row, none for empty
DIGITS = [
    (5, GIVEN), None, (3, GIVEN),
    None, (7, INK), None,
    (1, GIVEN), None, (9, GIVEN),
]


def draw(size, cell, scale):
    #cell pixels per cell, scale pixels per font pixel, the grid centred on the face
    image = Image.new('RGB', (size, size), FACE)
    pen = ImageDraw.Draw(image)
    grid = 3 * cell + 4
    left = (size - grid) // 2
    top = (size - grid) // 2
    pen.rectangle([left, top, left + grid - 1, top + grid - 1], fill=LINE)
    for k, digit in enumerate(DIGITS):
        x = left + 1 + (k % 3) * (cell + 1)
        y = top + 1 + (k // 3) * (cell + 1)
        pen.rectangle([x, y, x + cell - 1, y + cell - 1], fill=CELL)
        if not digit:
            continue
        value, colour = digit
        if scale == 0:
            #too small for digits, a dot stands in
            pen.rectangle([x + 1, y + 1, x + cell - 2, y + cell - 2], fill=colour)
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
    return image


def main():
    small = draw(16, 4, 0)
    icon = draw(32, 9, 1)
    large = draw(48, 14, 2)
    icon.save('src/shell/icons/sudoku.png')
    icon.resize((192, 192), Image.NEAREST).save('public/sudoku/icon.png')
    tile = Image.new('RGB', (558, 558), FACE)
    tile.paste(icon.resize((512, 512), Image.NEAREST), (23, 23))
    tile.save('public/sudoku/tile.png')
    #the ico writer scales one image, so each size is saved from its own drawing
    large.save('public/sudoku/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[icon, small])


if __name__ == '__main__':
    main()
