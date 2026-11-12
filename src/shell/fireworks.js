import { load } from './storage'

//fireworks over the background and behind the game window, in the theme's own colours
//one canvas that exists only while they play

const square = 'square'
const dot = 'dot'
const glyph = 'glyph'

//how each theme's bursts look: colours, sparks, pull of gravity, size in css pixels
const looks = {
  classic: {
    colors: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ffffff'],
    shape: square,
    gravity: 90,
    size: 3,
  },
  synthwave: {
    colors: ['#ff2a95', '#00e5ff', '#ffe600', '#a259ff'],
    shape: dot,
    gravity: 70,
    size: 2.6,
    glow: 10,
  },
  solarized: {
    colors: [
      '#b58900',
      '#cb4b16',
      '#dc322f',
      '#d33682',
      '#6c71c4',
      '#268bd2',
      '#2aa198',
      '#859900',
    ],
    shape: dot,
    gravity: 80,
    size: 2.6,
  },
  matrix: {
    colors: ['#2cff6e', '#d4ffe0', '#0f9d3a'],
    shape: glyph,
    gravity: 40,
    size: 15,
    glyphs: 'ｼﾓｱｦｿﾅﾊﾋﾌﾍﾎ',
  },
  nord: {
    colors: ['#88c0d0', '#81a1c1', '#8fbcbb', '#eceff4', '#b48ead'],
    shape: dot,
    gravity: 30,
    size: 2.4,
    glow: 6,
  },
}
looks['solarized-phosphor'] = looks.solarized

export const lookOf = (theme) => looks[theme] || looks.classic

const SPARKS = 70
const TRAIL = 5
//rockets go up until a press or key, or this many seconds, whichever is first
const LIMIT = 120

//the next rocket: where it bursts as fractions of the screen, and the wait after it in seconds
export const launch = (rng) => ({
  x: 0.15 + rng() * 0.7,
  y: 0.15 + rng() * 0.4,
  wait: 0.3 + rng() * 0.4,
})

//the sparks of a burst: a ring of varied speeds all one colour family, with a second colour in some
export const sparks = (look, x, y, rng) => {
  const main = look.colors[Math.floor(rng() * look.colors.length)]
  const other = look.colors[Math.floor(rng() * look.colors.length)]
  return Array.from({ length: SPARKS }, () => {
    const angle = rng() * Math.PI * 2
    const speed = (0.25 + 0.75 * Math.sqrt(rng())) * 220
    const life = 1.1 + rng() * 0.9
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      age: 0,
      trail: [],
      color: rng() < 0.2 ? other : main,
      char: look.glyphs ? look.glyphs[Math.floor(rng() * look.glyphs.length)] : '',
    }
  })
}

//moves sparks on by dt seconds with drag and gravity, those past their life are dropped
export const advance = (list, dt, look) =>
  list.filter((p) => {
    p.age += dt
    if (p.age >= p.life) return false
    p.trail.push([p.x, p.y])
    if (p.trail.length > TRAIL) p.trail.shift()
    const drag = Math.exp(-1.6 * dt)
    p.vx *= drag
    p.vy = p.vy * drag + look.gravity * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    return true
  })

const calm = () => !globalThis.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches

let canvas = null
let running = false

//the page's own canvas sits in main, over its wallpaper and under the windows
//without one a canvas goes after the background's
const place = () => {
  const page = document.getElementById('fireworks')
  if (page) return page
  if (canvas?.isConnected) return canvas
  canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:none'
  const background = document.body.querySelector('canvas')
  if (background) background.after(canvas)
  else document.body.prepend(canvas)
  return canvas
}

//classic minesweeper keeps the original's quiet win, so its fireworks are a setting of their own, off at first
export const fireworksKey = (page, theme) =>
  page === 'minesweeper' && theme === 'classic' ? 'minesweeper.fireworks' : 'fireworks'

export const fireworksOn = (page, theme) =>
  fireworksKey(page, theme) === 'fireworks'
    ? load('fireworks') !== 'off'
    : load('minesweeper.fireworks') === 'on'

//a show for a win, unless they are off, the tab is hidden, the boss key is up or motion is reduced
//it keeps launching until the next press or key (not one that came before it, nor a held key
//repeating) or two minutes, then the rockets and bursts in the air finish
export const celebrate = (page, theme = document.documentElement.dataset.theme) => {
  if (running || !fireworksOn(page, theme) || document.hidden || calm()) return
  const root = document.documentElement
  if (root.dataset.boss) return
  const target = place()
  const context = target.getContext?.('2d')
  if (!context) return
  const look = lookOf(theme)
  const scale = Math.min(window.devicePixelRatio || 1, 2)
  const width = innerWidth
  const height = innerHeight
  target.width = Math.round(width * scale)
  target.height = Math.round(height * scale)
  target.style.display = 'block'
  context.setTransform(scale, 0, 0, scale, 0, 0)
  const started = performance.now()
  let open = true
  let wait = 0
  let alive = []
  let rockets = []
  let clock = 0
  let last = null
  running = true

  //only a press or key after the show began ends the launching
  const interrupt = (event) => {
    if (event.timeStamp > started && !event.repeat) open = false
  }
  const listening = ['pointerdown', 'keydown']
  for (const name of listening) window.addEventListener(name, interrupt, true)

  const stop = () => {
    for (const name of listening) window.removeEventListener(name, interrupt, true)
    running = false
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, target.width, target.height)
    target.style.display = 'none'
  }

  const frame = (now) => {
    //a long gap, such as a hidden tab, would fling the sparks, so steps are capped
    const dt = last === null ? 0 : Math.min(Math.max((now - last) / 1000, 0), 0.05)
    last = now
    clock += dt
    if (root.dataset.boss || document.hidden) return stop()
    if (clock > LIMIT) open = false
    wait -= dt
    while (open && wait <= 0) {
      const next = launch(Math.random)
      wait += next.wait
      rockets.push({
        x: next.x * width,
        y: height,
        top: next.y * height,
        speed: 520 + Math.random() * 120,
        trail: [],
      })
    }
    //a rocket climbs to its height, then bursts
    rockets = rockets.filter((r) => {
      r.trail.push([r.x, r.y])
      if (r.trail.length > 2 * TRAIL) r.trail.shift()
      r.y -= r.speed * dt
      if (r.y > r.top) return true
      alive.push(...sparks(look, r.x, r.y, Math.random))
      return false
    })
    alive = advance(alive, dt, look)
    context.clearRect(0, 0, width, height)
    context.globalCompositeOperation = 'lighter'
    if (look.shape === glyph) context.font = `${look.size}px monospace`
    for (const r of rockets)
      draw(context, look, { ...r, color: look.colors[0], char: look.glyphs?.[0] || '' }, 1)
    for (const p of alive) draw(context, look, p, 1 - p.age / p.life)
    if (open || rockets.length || alive.length) requestAnimationFrame(frame)
    else stop()
  }
  requestAnimationFrame(frame)
}

//one mark of a spark: a pixel, a glowing dot or a glyph
const mark = (context, look, p, x, y, alpha) => {
  context.globalAlpha = Math.max(0, alpha)
  context.fillStyle = p.color
  if (look.shape === glyph) {
    context.fillText(p.char, x, y)
  } else if (look.shape === square) {
    context.fillRect(Math.round(x), Math.round(y), look.size, look.size)
  } else {
    context.beginPath()
    const radius = look.size * (0.4 + 0.6 * alpha)
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
    //a glow is a wider, fainter dot under it, shadows left stray boxes in firefox
    if (look.glow) {
      context.globalAlpha = Math.max(0, alpha) * 0.25
      context.beginPath()
      context.arc(x, y, radius * 2.4, 0, Math.PI * 2)
      context.fill()
    }
  }
}

//a spark and the short trail behind it, both fading as it ages
const draw = (context, look, p, alpha) => {
  const { trail } = p
  trail.forEach(([x, y], k) => mark(context, look, p, x, y, (alpha * (k + 1)) / (trail.length + 2)))
  mark(context, look, p, p.x, p.y, alpha)
  context.globalAlpha = 1
}
