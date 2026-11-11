#renders chips.html's theme icons to ../<theme>.webp, 160px for a 40px chip on any screen
#needs playwright's firefox and pillow: py -3 -I src/shell/chips/source/chips.py
import io
import pathlib

from PIL import Image
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).parent
themes = ['classic', 'synthwave', 'matrix', 'nord', 'solarized', 'solarized-phosphor']

with sync_playwright() as p:
    browser = p.firefox.launch()
    page = browser.new_page(viewport={'width': 200, 'height': 300}, device_scale_factor=4)
    page.goto((here / 'chips.html').as_uri())
    #the fonts and pictures take a moment
    page.wait_for_timeout(1500)
    for theme in themes:
        shot = page.locator(f'[id="{theme}"]').screenshot()
        image = Image.open(io.BytesIO(shot)).convert('RGB')
        image.save(here.parent / f'{theme}.webp', quality=86, method=6)
        print(theme, image.size)
    browser.close()
