#draws the bridges icons in public/bridges and the taskbar's src/shell/icons/bridges.png
#four islands joined in a ring, one side doubled, on a board of water
#run from the repo root: py -3 src/bridges/icon.py
from PIL import Image, ImageDraw

FACE = (192, 192, 192)
WATER = (224, 224, 224)
LINE = (128, 128, 128)
ISLAND = (64, 64, 64)
BRIDGE = (0, 96, 160)
INK = (255, 255, 255)

TWO = ['###', '..#', '###', '#..', '###']


def draw(size, disc, scale):
    #disc pixels across an island, scale pixels per font pixel, the board centred on the face
    image = Image.new('RGB', (size, size), FACE)
    pen = ImageDraw.Draw(image)
    board = size - 2
    pen.rectangle([1, 1, 1 + board - 1, 1 + board - 1], fill=LINE)
    pen.rectangle([2, 2, board - 1, board - 1], fill=WATER)
    near, far = 3 + disc // 2, size - 4 - disc // 2
    thick = max(1, size // 16)
    gap = thick + 1
    #the top and left sides single, the bottom and right doubled
    #top: one bridge
    pen.rectangle([near, near - thick // 2, far, near - thick // 2 + thick - 1], fill=BRIDGE)
    #left: one bridge
    pen.rectangle([near - thick // 2, near, near - thick // 2 + thick - 1, far], fill=BRIDGE)
    #bottom: two bridges
    for d in (-gap // 2 - 1, gap // 2 + 1):
        pen.rectangle([near, far + d - thick // 2, far, far + d - thick // 2 + thick - 1], fill=BRIDGE)
    #right: two bridges
    for d in (-gap // 2 - 1, gap // 2 + 1):
        pen.rectangle([far + d - thick // 2, near, far + d - thick // 2 + thick - 1, far], fill=BRIDGE)
    glyphs = {(near, near): TWO, (far, near): TWO, (near, far): TWO, (far, far): TWO}
    for (cx, cy), bits in glyphs.items():
        pen.ellipse([cx - disc // 2, cy - disc // 2, cx - disc // 2 + disc, cy - disc // 2 + disc], fill=ISLAND)
        if scale:
            dx = cx - (3 * scale) // 2
            dy = cy - (5 * scale) // 2
            for row, line in enumerate(bits):
                for col, bit in enumerate(line):
                    if bit == '#':
                        pen.rectangle(
                            [dx + col * scale, dy + row * scale, dx + (col + 1) * scale - 1, dy + (row + 1) * scale - 1],
                            fill=INK,
                        )
    return image


def main():
    small = draw(16, 5, 0)
    icon = draw(32, 10, 1)
    large = draw(48, 14, 2)
    icon.save('src/shell/icons/bridges.png')
    icon.resize((192, 192), Image.NEAREST).save('public/bridges/icon.png')
    tile = Image.new('RGB', (558, 558), FACE)
    tile.paste(icon.resize((512, 512), Image.NEAREST), (23, 23))
    tile.save('public/bridges/tile.png')
    #the ico writer scales one image, so each size is saved from its own drawing
    large.save('public/bridges/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[icon, small])


if __name__ == '__main__':
    main()
