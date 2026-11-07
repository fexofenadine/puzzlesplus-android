#draws the 2048 icons in public/2048 and the taskbar's src/shell/icons/2048.png
#four raised tiles in classic's tile colours, 2, 4, 8 and 16 in pixel digits
#run from the repo root: py -3 src/2048/icon.py
import colorsys

from PIL import Image, ImageDraw

FONT = {
    1: ['.#.', '##.', '.#.', '.#.', '###'],
    2: ['###', '..#', '###', '#..', '###'],
    4: ['#.#', '#.#', '###', '..#', '..#'],
    6: ['###', '#..', '###', '#.#', '###'],
    8: ['###', '#.#', '###', '#.#', '###'],
}

FACE = (192, 192, 192)
LIGHT = (255, 255, 255)
SHADOW = (123, 123, 123)


def mix(k):
    #classic's tile colour for power k, the same hue ramp as the css
    r, g, b = colorsys.hls_to_rgb(((200 - 25 * k) % 360) / 360, 0.88 - 0.04 * k, 0.7)
    return round(r * 255), round(g * 255), round(b * 255)


#each digit with the power its colour comes from, further up the ramp than its own so the icon
#shows the game's colours at a glance
TILES = [(2, 3), (4, 5), (8, 7), (16, 9)]


def text(pen, x, y, value, scale, colour):
    digits = [int(c) for c in str(value)]
    width = len(digits) * 3 * scale + (len(digits) - 1) * scale
    for k, digit in enumerate(digits):
        left = x - width // 2 + k * 4 * scale
        for row, bits in enumerate(FONT[digit]):
            for col, bit in enumerate(bits):
                if bit == '#':
                    pen.rectangle([left + col * scale, y + row * scale,
                                   left + (col + 1) * scale - 1, y + (row + 1) * scale - 1], fill=colour)


def draw(size, tile, gap, scale):
    image = Image.new('RGB', (size, size), FACE)
    pen = ImageDraw.Draw(image)
    left = (size - 2 * tile - gap) // 2
    for k, (value, power) in enumerate(TILES):
        x = left + (k % 2) * (tile + gap)
        y = left + (k // 2) * (tile + gap)
        pen.rectangle([x, y, x + tile - 1, y + tile - 1], fill=mix(power))
        pen.line([x, y, x + tile - 1, y], fill=LIGHT)
        pen.line([x, y, x, y + tile - 1], fill=LIGHT)
        pen.line([x, y + tile - 1, x + tile - 1, y + tile - 1], fill=SHADOW)
        pen.line([x + tile - 1, y, x + tile - 1, y + tile - 1], fill=SHADOW)
        if scale:
            colour = (255, 255, 255) if power > 5 else (0, 0, 0)
            text(pen, x + tile // 2, y + (tile - 5 * scale) // 2, value, scale, colour)
    return image


def main():
    small = draw(16, 7, 0, 0)
    icon = draw(32, 15, 1, 1)
    large = draw(48, 22, 2, 2)
    icon.save('src/shell/icons/2048.png')
    icon.resize((192, 192), Image.NEAREST).save('public/2048/icon.png')
    tile = Image.new('RGB', (558, 558), FACE)
    tile.paste(icon.resize((512, 512), Image.NEAREST), (23, 23))
    tile.save('public/2048/tile.png')
    large.save('public/2048/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[icon, small])


if __name__ == '__main__':
    main()
