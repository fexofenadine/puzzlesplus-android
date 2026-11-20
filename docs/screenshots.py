#retakes the readme's pictures (docs/screenshots) and the link previews (public/<game>/<game>.jpg)
#from a dev server at localhost:5173, in playwright's firefox with webgl2 switched on
#usage: py -3 -I docs/screenshots.py . [shot names...], from the repo's root with yarn start running
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

OUT = sys.argv[1]
ONLY = sys.argv[2:]
BASE = 'http://localhost:5173/'

#shaders keep drawing and never shrink in a software renderer: pages may always draw, a draw costs nothing
INIT = """
document.documentElement.dataset.always = ''
if (window.WebGL2RenderingContext) WebGL2RenderingContext.prototype.readPixels = function () {}
"""

def ctx(b, theme, store=None, size=(1200, 675), scale=1, touch=False):
    c = b.new_context(viewport={'width': size[0], 'height': size[1]}, device_scale_factor=scale,
                      has_touch=touch)
    values = {'theme': theme, 'takuzu.ladder': '5', **(store or {})}
    c.add_init_script('if (!sessionStorage.getItem("seeded")) {' +
                      ''.join(f'localStorage.setItem({json.dumps(k)}, {json.dumps(v)});' for k, v in values.items()) +
                      'sessionStorage.setItem("seeded", "1") }' + INIT)
    return c

def open_page(b, theme, path, store=None, **kw):
    pg = ctx(b, theme, store, **kw).new_page()
    pg.goto(BASE + path)
    pg.wait_for_timeout(2500)
    return pg

def menu(pg, name, item):
    pg.locator(f'[data-name="{name}"]').first.click()
    pg.wait_for_timeout(150)
    pg.get_by_role('button', name=item, exact=True).first.click()
    pg.wait_for_timeout(250)

#one step of the game's own hint, its first cell applied the way a player would
def hint_step(pg, game):
    pg.keyboard.press('h')
    pg.wait_for_timeout(120)
    cells = pg.locator('[class*=hintPlace]')
    for k in range(cells.count()):
        cell = cells.nth(k)
        cls = cell.get_attribute('class') or ''
        text = (cell.inner_text() or '').strip()
        if game == 'takuzu':
            cell.click(button='left' if text == '0' else 'right')
        elif game == 'nonograms':
            cell.click(button='left' if 'ghostFill' in cls else 'right')
        elif game in ('sudoku', 'futoshiki'):
            cell.click()
            pg.keyboard.press(text[-1])
        elif game == 'lightup':
            if not cell.locator('[class*=bulb]').count(): continue
            cell.click()
        pg.wait_for_timeout(40)
        return True
    return False

def play(pg, game, steps):
    for _ in range(steps):
        if not hint_step(pg, game): break
    pg.wait_for_timeout(200)

def still(pg, name, quality=3):
    path = os.path.join(OUT, name)
    png = path + '.png'
    pg.screenshot(path=png)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', png, '-q:v', str(quality), path], check=True)
    os.remove(png)
    print('wrote', name)

#28 frames at 960 px, as the readme's other animations
def animated(pg, name, frames=28, gap=110):
    tmp = os.path.join(OUT, '_frames')
    os.makedirs(tmp, exist_ok=True)
    for f in os.listdir(tmp): os.remove(os.path.join(tmp, f))
    for k in range(frames):
        pg.screenshot(path=os.path.join(tmp, f'{k:03d}.png'))
        pg.wait_for_timeout(gap)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '8', '-i', os.path.join(tmp, '%03d.png'),
                    '-vf', 'scale=960:-1:flags=lanczos', '-c:v', 'libwebp_anim', '-lossless', '0',
                    '-quality', '50', '-loop', '0', os.path.join(OUT, name)], check=True)
    for f in os.listdir(tmp): os.remove(os.path.join(tmp, f))
    os.rmdir(tmp)
    print('wrote', name, os.path.getsize(os.path.join(OUT, name)) // 1024, 'kB')

def first_click(pg):
    #minesweeper deals on the first opened cell; no guessing clears round it and deals a solvable board
    menu(pg, 'game', 'No Guessing')
    box = pg.locator('[class*=Game_field]').first.bounding_box()
    pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    pg.wait_for_timeout(300)

SHOTS = {}
def shot(f):
    SHOTS[f.__name__] = f
    return f

@shot
def classic_minesweeper(b):
    pg = open_page(b, 'classic', 'minesweeper/', {'level': 'intermediate'})
    first_click(pg)
    pg.keyboard.press('h')
    pg.wait_for_timeout(300)
    pg.locator('[title=Start]').click()
    pg.wait_for_timeout(300)
    still(pg, 'docs/screenshots/classic-minesweeper.jpg')

@shot
def classic_clouds_takuzu(b):
    pg = open_page(b, 'classic', 'takuzu/', {'takuzu.size': '10', 'takuzu.errors': 'on',
        'backgrounds': json.dumps({'version': 2, 'driftclouds': {'animated': True, 'resolution': 100}})})
    play(pg, 'takuzu', 30)
    #three alike in a row, which show errors marks
    empty = pg.locator('[class*=Cell_empty]')
    for k in range(3):
        empty.first.click()
        pg.wait_for_timeout(60)
    pg.mouse.move(5, 5)
    animated(pg, 'docs/screenshots/classic-clouds-takuzu.webp')

@shot
def synthwave_minesweeper(b):
    pg = open_page(b, 'synthwave', 'minesweeper/', {'level': 'expert',
        'backgrounds': json.dumps({'version': 2, 'neon': {'resolution': 100}})})
    first_click(pg)
    cells = pg.locator('[class*=Game_active] > *')
    k = 0
    while pg.locator('[class*=fieldLost]').count() == 0 and k < 400:
        n = cells.count()
        if n == 0: break
        cells.nth((k * 37) % n).click()
        k += 1
    pg.wait_for_timeout(400)
    menu(pg, 'game', 'Best Times...')
    animated(pg, 'docs/screenshots/synthwave-minesweeper.webp')

@shot
def matrix_nonograms(b):
    pg = open_page(b, 'matrix', 'nonograms/', {'nonograms.size': '15', 'nonograms.rain': 'on'})
    play(pg, 'nonograms', 60)
    pg.keyboard.press('h')
    pg.mouse.move(5, 5)
    animated(pg, 'docs/screenshots/matrix-nonograms.webp')

@shot
def nord_nonograms(b):
    pg = open_page(b, 'nord', 'nonograms/', {'nonograms.size': '25', 'nonograms.level': '3', 'maximised': 'yes'})
    play(pg, 'nonograms', 90)
    pg.locator('[data-name="display"]').first.click()
    pg.wait_for_timeout(150)
    pg.get_by_role('button', name='Theme', exact=True).first.hover()
    pg.wait_for_timeout(200)
    animated(pg, 'docs/screenshots/nord-nonograms.webp')

@shot
def solarized_takuzu(b):
    pg = open_page(b, 'solarized', 'takuzu/', {'takuzu.size': '8',
        'backgrounds': json.dumps({'version': 2, 'truchet': {'animated': False}})})
    #every cell but one by the hints, then the last one wrong
    for _ in range(80):
        if pg.locator('[class*=Cell_empty]').count() <= 1: break
        if not hint_step(pg, 'takuzu'): break
    last = pg.locator('[class*=Cell_empty]').first
    pg.keyboard.press('h'); pg.wait_for_timeout(150)
    right = (pg.locator('[class*=hintPlace]').first.inner_text() or '0').strip()
    last.click(button='right' if right == '0' else 'left')
    pg.wait_for_timeout(3000)
    still(pg, 'docs/screenshots/solarized-takuzu.jpg')

@shot
def phosphor_open_games(b):
    pg = open_page(b, 'solarized-phosphor', 'sudoku/')
    pg.wait_for_timeout(40000)
    pg.locator('[class*=Dialog_header] [class*=Dialog_button] button').first.click()
    pg.wait_for_timeout(500)
    animated(pg, 'docs/screenshots/phosphor-open-games.webp')

@shot
def guide(b):
    pg = open_page(b, 'terafox', 'takuzu/guide/#gaps')
    pg.wait_for_timeout(1500)
    still(pg, 'docs/screenshots/guide.jpg')

@shot
def matrix_sudoku(b):
    pg = open_page(b, 'matrix', 'sudoku/', {'sudoku.level': '1'})
    play(pg, 'sudoku', 18)
    menu(pg, 'game', 'Auto Notes')
    pg.keyboard.press('h')
    pg.wait_for_timeout(300)
    pg.mouse.move(5, 5)
    still(pg, 'docs/screenshots/matrix-sudoku.jpg')

@shot
def phosphor_2048(b):
    pg = open_page(b, 'solarized-phosphor', '2048/')
    pg.wait_for_timeout(9000)
    for k in range(40):
        pg.keyboard.press(['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowDown'][k % 4])
        pg.wait_for_timeout(60)
    pg.keyboard.press('h')
    pg.wait_for_timeout(600)
    still(pg, 'docs/screenshots/phosphor-2048.jpg')

@shot
def synthwave_lightup(b):
    pg = open_page(b, 'synthwave', 'lightup/', {'lightup.size': '14',
        'backgrounds': json.dumps({'version': 2, 'neon': {'resolution': 100}})})
    play(pg, 'lightup', 18)
    pg.keyboard.press('h')
    pg.wait_for_timeout(500)
    pg.mouse.move(5, 5)
    still(pg, 'docs/screenshots/synthwave-lightup.jpg')

@shot
def lightup_guide(b):
    pg = open_page(b, 'nord', 'lightup/guide/#lone',
        {'backgrounds': json.dumps({'version': 2, 'substrate': {'animated': False}})})
    pg.wait_for_timeout(1500)
    still(pg, 'docs/screenshots/lightup-guide.jpg')

@shot
def vaporwave_2048(b):
    pg = open_page(b, 'vaporwave', '2048/')
    for k in range(30):
        pg.keyboard.press(['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowDown'][k % 4])
        pg.wait_for_timeout(60)
    pg.keyboard.press('h')
    pg.wait_for_timeout(600)
    animated(pg, 'docs/screenshots/vaporwave-2048.webp')

@shot
def terafox_futoshiki(b):
    pg = open_page(b, 'terafox', 'futoshiki/', {'futoshiki.size': '6'})
    pg.wait_for_timeout(20000)
    play(pg, 'futoshiki', 12)
    pg.keyboard.press('h')
    pg.wait_for_timeout(300)
    pg.mouse.move(5, 5)
    animated(pg, 'docs/screenshots/terafox-futoshiki.webp')

@shot
def portrait(b):
    pg = open_page(b, 'matrix', 'minesweeper/', {'level': 'expert',
        'backgrounds': json.dumps({'version': 2, 'matrix': {'animated': False}})}, size=(390, 844), scale=2, touch=True)
    cells = pg.locator('[class*=Game_active] > *, [class*=Game_inactive] > *')
    cells.nth(cells.count() // 2).tap()
    pg.wait_for_timeout(500)
    still(pg, 'docs/screenshots/portrait.jpg')

#link previews, 1200 x 675, a game in play with its hint
PREVIEWS = {
    'minesweeper': ('classic', {'level': 'intermediate'}, 0),
    'takuzu': ('synthwave', {'takuzu.size': '8'}, 10),
    'nonograms': ('nord', {'nonograms.size': '10'}, 6),
    'sudoku': ('synthwave', {}, 14),
    '2048': ('classic', {}, 0),
    'lightup': ('classic', {'lightup.size': '10', 'scale': '1.5'}, 6),
    'futoshiki': ('classic', {'futoshiki.size': '5', 'scale': '1.5'}, 6),
}

for game, (theme, store, steps) in PREVIEWS.items():
    def preview(b, game=game, theme=theme, store=store, steps=steps):
        backgrounds = {'version': 2, 'neon': {'resolution': 100}}
        pg = open_page(b, theme, game + '/', {**store, 'backgrounds': json.dumps(backgrounds)})
        if game == 'minesweeper':
            first_click(pg)
        elif game == '2048':
            for k in range(24):
                pg.keyboard.press(['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowDown'][k % 4])
                pg.wait_for_timeout(60)
        else:
            play(pg, game, steps)
        pg.keyboard.press('h')
        pg.wait_for_timeout(500)
        pg.mouse.move(5, 5)
        still(pg, f'public/{game}/{game}.jpg')
    preview.__name__ = 'preview_' + game
    SHOTS[preview.__name__] = preview

with sync_playwright() as p:
    b = p.firefox.launch(firefox_user_prefs={'webgl.force-enabled': True, 'webgl.enable-webgl2': True})
    for name, f in SHOTS.items():
        if ONLY and name not in ONLY: continue
        try:
            f(b)
        except Exception as e:
            print('FAILED', name, type(e).__name__, str(e)[:200])
    b.close()
