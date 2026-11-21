#retakes the readme's pictures (docs/android) on a running emulator with the debug build installed
#py -3 tools/readme-shots.py [names...]; needs what droid.py needs
import os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import droid as d
from PIL import Image

DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'android')
ONLY = sys.argv[1:]
WALLPAPER = d.PKG + '/io.github.fexofenadine.puzzlesplus.PuzzlesWallpaper'
SETTINGS = d.PKG + '/io.github.fexofenadine.puzzlesplus.WallpaperSettings'


def save(name):
    #the screen at half size, as a jpeg for the readme
    png = d.shot(name)
    Image.open(png).save(os.path.join(DOCS, name + '.jpg'), quality=88)
    os.remove(png)
    print('wrote', name)


def key(pg, k):
    pg.ev("window.dispatchEvent(new KeyboardEvent('keydown', { key: %r, keyCode: %d, which: %d, bubbles: true })); 1" % (k, ord(k.upper()), ord(k.upper())))
    time.sleep(0.4)


def hints(pg, steps):
    #the game's own hint, its first cell tapped, so many times
    for _ in range(steps):
        key(pg, 'h')
        try:
            pg.hit('[class*=hintPlace], [class*=BridgesCell_ghost]')
        except RuntimeError:
            break
        time.sleep(0.3)


def ui(text):
    #where android's own screens show a text, from a layout dump
    d.adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml')
    xml = d.adb('shell', 'cat', '/sdcard/ui.xml')
    m = re.search(r'text="%s"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' % re.escape(text), xml)
    if not m:
        return None
    x1, y1, x2, y2 = map(int, m.groups())
    return (x1 + x2) / 2, (y1 + y2) / 2


def go(pg, path, store):
    #a page with a fresh game: a game kept from before comes back paused, so it is resumed
    pg = d.goto(pg, path, store)
    #matrix and synthwave are only worth a picture once they have run for a minute
    if store.get('theme') in ('synthwave', 'matrix'):
        time.sleep(60)
    try:
        pg.hit('[title="Resume (P)"]')
    except RuntimeError:
        pass
    time.sleep(0.5)
    return pg


SHOTS = []
def shot(f):
    SHOTS.append(f)
    return f


@shot
def minesweeper_classic(pg):
    pg = go(pg, 'minesweeper/index.html', {'theme': 'classic', 'level': 'beginner'})
    pg.hit('[class*=Game_field]')
    time.sleep(1)
    save('minesweeper-classic')
    return pg


@shot
def minesweeper_synthwave(pg):
    pg = go(pg, 'minesweeper/index.html', {'theme': 'synthwave', 'level': 'beginner'})
    pg.hit('[class*=Game_field]')
    time.sleep(0.5)
    key(pg, 'h')
    time.sleep(2)
    save('minesweeper-synthwave')
    return pg


@shot
def drawer(pg):
    pg = go(pg, 'sudoku/index.html', {'theme': 'synthwave'})
    pg.hit('button[title=Menu]')
    time.sleep(1)
    save('drawer')
    d.back()
    return pg


@shot
def options(pg):
    pg = go(pg, 'minesweeper/index.html', {'theme': 'synthwave'})
    pg.hit('button[title=Options]')
    time.sleep(1.2)
    save('options')
    d.back()
    return pg


@shot
def nonograms_matrix(pg):
    pg = go(pg, 'nonograms/index.html', {'theme': 'matrix', 'nonograms.size': '10', 'nonograms.rain': 'on'})
    hints(pg, 10)
    key(pg, 'h')
    time.sleep(1.5)
    save('nonograms-matrix')
    return pg


@shot
def bridges_vaporwave(pg):
    pg = go(pg, 'bridges/index.html', {'theme': 'vaporwave', 'bridges.size': '7'})
    hints(pg, 5)
    key(pg, 'h')
    time.sleep(1.5)
    save('bridges-vaporwave')
    return pg


@shot
def wallpaper(pg):
    #its settings, on synthwave, then the wallpaper set on the home screen
    d.adb('shell', 'am', 'start', '-n', SETTINGS)
    time.sleep(7)
    d.tap(830, 312)
    time.sleep(1.5)
    where = ui('Synthwave')
    if where:
        d.tap(*where)
    #synthwave has run for a minute before the picture
    time.sleep(60)
    save('wallpaper-settings')
    d.back()
    d.adb('shell', 'am', 'start', '-a', 'android.service.wallpaper.CHANGE_LIVE_WALLPAPER',
          '--ecn', 'android.service.wallpaper.extra.LIVE_WALLPAPER_COMPONENT', WALLPAPER)
    time.sleep(8)
    where = ui('Set wallpaper')
    if where:
        d.tap(*where)
        time.sleep(2)
        for choice in ('Home screen', 'Home and lock screens'):
            spot = ui(choice)
            if spot:
                d.tap(*spot)
                break
    time.sleep(3)
    d.adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
    time.sleep(6)
    save('wallpaper-home')
    d.start()
    return d.Page()


if __name__ == '__main__':
    #the system's own font size, as most phones have it
    d.adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    d.start()
    d.rotate(False)
    pg = d.Page()
    for f in SHOTS:
        if ONLY and f.__name__ not in ONLY:
            continue
        pg = f(pg)
    print('page errors:', pg.logs or 'none')
