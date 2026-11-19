#renders wordmark.html to pngs: py -3 -I docs/banner/render.py out.png look=a blurb=1 [more pairs, out, ...]
#each png name is followed by its query, e.g. a1.png look=a blurb=1 b0.png look=b
#the social preview: docs/social-preview.png look=c blurb=0, then copied to public/preview.png
#pngs are squeezed to stay under github's 1 MB limit for social previews
import os, sys
from urllib.parse import urlencode
from PIL import Image
from playwright.sync_api import sync_playwright

PAGE = os.path.abspath(os.path.join('docs', 'banner', 'wordmark.html')).replace('\\', '/')
jobs, cur = [], None
for arg in sys.argv[1:]:
    if '=' in arg: cur[1].update([arg.split('=', 1)])
    else: cur = (arg, {}); jobs.append(cur)
with sync_playwright() as p:
    b = p.firefox.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 640})
    for out, query in jobs:
        pg.goto('file:///' + PAGE + '?' + urlencode(query))
        pg.wait_for_timeout(600)
        pg.locator('#card').screenshot(path=out)
        Image.open(out).convert('RGB').save(out, optimize=True, compress_level=9)
        print('wrote', out)
    b.close()
