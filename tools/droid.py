#drives the debug app on a running emulator or phone: adb for touches, keys and screenshots,
#the webview's devtools protocol (cdp) to read and run javascript in the page
#needs py -3 -m pip install pillow requests websocket-client
#py -3 tools/droid.py runs a short tour and saves screenshots to tools/droid-shots
import io, json, os, re, subprocess, time
from PIL import Image

PKG = 'io.github.fexofenadine.puzzlesplus.debug'
ACTIVITY = PKG + '/io.github.fexofenadine.puzzlesplus.MainActivity'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'droid-shots')
PORT = 9333


def adb(*args, binary=False):
    r = subprocess.run(['adb', *args], capture_output=True)
    return r.stdout if binary else r.stdout.decode(errors='replace').strip()


def start():
    adb('shell', 'am', 'start', '-n', ACTIVITY)
    time.sleep(4)


def shot(name, scale=0.5):
    #a screenshot of the whole screen, system bars and keyboard included
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(io.BytesIO(adb('exec-out', 'screencap', '-p', binary=True))).convert('RGB')
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    path = os.path.join(OUT, name + '.png')
    im.save(path)
    return path


def tap(x, y, hold=None):
    #a real touch in screen pixels; hold in ms makes it a long press
    x, y = str(int(x)), str(int(y))
    if hold:
        adb('shell', 'input', 'swipe', x, y, x, y, str(hold))
    else:
        adb('shell', 'input', 'tap', x, y)
    time.sleep(0.5)


def swipe(x1, y1, x2, y2, ms=250):
    adb('shell', 'input', 'swipe', *(str(int(v)) for v in (x1, y1, x2, y2, ms)))
    time.sleep(0.6)


def back():
    adb('shell', 'input', 'keyevent', '4')
    time.sleep(0.6)


def rotate(landscape):
    adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0')
    adb('shell', 'settings', 'put', 'system', 'user_rotation', '1' if landscape else '0')
    time.sleep(2.5)


def buzzes():
    #the haptic effects android has played lately, as (time, reason)
    return re.findall(r'(\d\d:\d\d:\d\d\.\d+) \|\s+effect.*?reason: (\S+)', adb('shell', 'dumpsys vibrator_manager'), re.S)


def _target():
    import requests
    return [t for t in requests.get(f'http://localhost:{PORT}/json').json() if t['type'] == 'page'][0]


class Page:
    #the app's page over cdp; debug builds allow it, release builds don't
    def __init__(self):
        import websocket
        pid = adb('shell', 'pidof', PKG).split()[0]
        adb('forward', f'tcp:{PORT}', 'localabstract:webview_devtools_remote_' + pid)
        for _ in range(20):
            try:
                self.ws = websocket.create_connection(_target()['webSocketDebuggerUrl'], suppress_origin=True)
                break
            except Exception:
                time.sleep(0.7)
        self.n = 0
        self.logs = []
        self.send('Runtime.enable')

    def send(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({'id': self.n, 'method': method, 'params': params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get('id') == self.n:
                return m.get('result', m)
            #errors the page logs on the way are kept in logs
            if m.get('method') == 'Runtime.exceptionThrown':
                self.logs.append(json.dumps(m['params']['exceptionDetails'])[:400])
            if m.get('method') == 'Runtime.consoleAPICalled' and m['params']['type'] == 'error':
                self.logs.append(' '.join(str(a.get('value', a.get('description'))) for a in m['params']['args'])[:400])

    def ev(self, js):
        #runs javascript in the page and gives back its value
        r = self.send('Runtime.evaluate', expression=js, returnByValue=True, awaitPromise=True)
        if 'exceptionDetails' in r:
            raise RuntimeError(json.dumps(r['exceptionDetails'])[:600])
        return r['result'].get('value')

    def where(self, selector, nth=0):
        #where an element shows, in screen pixels, found by hit testing the page: on webview 124
        #getBoundingClientRect ignores css zoom, which the boards and dialogs use
        p = self.ev("""(() => { const t = [...document.querySelectorAll(%s)][%d]; if (!t) return null
          for (let y = 2; y < innerHeight; y += 3) for (let x = 2; x < innerWidth; x += 3) {
            const e = document.elementFromPoint(x, y); if (e && (e === t || t.contains(e))) return [x + 4, y + 4, devicePixelRatio] }
          return null })()""" % (json.dumps(selector), nth))
        if not p:
            raise RuntimeError('not on screen: ' + selector)
        view = json.loads(_target()['description'])
        return view['screenX'] + p[0] * p[2], view['screenY'] + p[1] * p[2]

    def hit(self, selector, nth=0, hold=None):
        tap(*self.where(selector, nth), hold=hold)

    def click(self, text):
        #a button by its text, clicked from script (no touch), for getting somewhere quickly
        if not self.ev("(() => { const b = [...document.querySelectorAll('button, a')].find(b => b.textContent.trim().startsWith(%s)); if (b) b.click(); return Boolean(b) })()" % json.dumps(text)):
            raise RuntimeError('no button ' + text)
        time.sleep(0.6)

    def touch(self, kind, points):
        #real touches in page pixels through cdp, which adb's input can't do with two fingers
        #kind is touchStart, touchMove or touchEnd; points are the fingers down, [(x, y), ...]
        self.send('Input.dispatchTouchEvent', type=kind,
                  touchPoints=[{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(points)])

    def pinch(self, a, b, a2, b2, steps=8):
        #two fingers from a and b to a2 and b2, the second landing 30 ms after the first
        self.touch('touchStart', [a])
        time.sleep(0.03)
        self.touch('touchStart', [a, b])
        for s in range(1, steps + 1):
            t = s / steps
            self.touch('touchMove', [(a[0] + (a2[0] - a[0]) * t, a[1] + (a2[1] - a[1]) * t),
                                     (b[0] + (b2[0] - b[0]) * t, b[1] + (b2[1] - b[1]) * t)])
            time.sleep(0.02)
        self.touch('touchEnd', [])
        time.sleep(0.4)

    def close(self):
        self.ws.close()


def goto(pg, path, store=None):
    #opens a page of the app, saving settings first, e.g. goto(pg, 'sudoku/index.html', {'theme': 'nord'})
    sets = ''.join('localStorage.setItem(%s,%s);' % (json.dumps(k), json.dumps(v)) for k, v in (store or {}).items())
    try:
        pg.ev("%s setTimeout(() => location.assign('https://localhost/%s'), 50); 1" % (sets, path))
    except Exception:
        pass
    time.sleep(3)
    pg.close()
    return Page()


if __name__ == '__main__':
    start()
    rotate(False)
    pg = Page()
    for game in ('minesweeper', 'takuzu', 'nonograms', 'sudoku', '2048', 'lightup', 'futoshiki'):
        pg = goto(pg, game + '/index.html', {'theme': 'nord'})
        shot(game)
    pg.hit('button[title=Menu]')
    shot('drawer')
    back()
    pg.hit('button[title=Options]')
    shot('options')
    back()
    rotate(True)
    pg.close()
    pg = Page()
    shot('sideways', 0.4)
    rotate(False)
    print('page errors:', pg.logs or 'none')
    print('screenshots in', OUT)
