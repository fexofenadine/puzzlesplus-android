//inlined into each game's page head by vite.config.js, so it runs before first paint
//apply the saved theme and window size before first paint
try {
  //everforest became terafox coral
  document.documentElement.dataset.theme = (localStorage.getItem('theme') || 'synthwave').replace(
    /^everforest$/,
    'terafox-coral',
  )
  //animated off classic unless it was switched off, the script corrects the rest
  //synthwave's only counts as off since its default changed (settings version 1)
  var theme = document.documentElement.dataset.theme
  var animated = theme !== 'classic'
  var ids = {
    synthwave: 'neon',
    matrix: 'matrix',
    nord: 'substrate',
    solarized: 'truchet',
    'solarized-phosphor': 'phosphor',
    vaporwave: 'qix',
    terafox: 'hextrail',
    'terafox-coral': 'coral',
  }
  if (ids[theme]) {
    try {
      var saved = JSON.parse(localStorage.getItem('backgrounds'))
      var off = saved[ids[theme]].animated === false
      animated = !(off && (theme !== 'synthwave' || saved.version >= 1))
    } catch {
      //nothing saved, the background moves
    }
  }
  if (animated) document.documentElement.dataset.background = 'animated'
  //full motion unless reduced or the system's was chosen, from the first paint
  var motion = localStorage.getItem('motion')
  if (motion !== 'system')
    document.documentElement.dataset.motion = motion === 'reduce' ? 'reduce' : 'full'
  document.documentElement.style.setProperty('--scale', localStorage.getItem('scale') || 1)
  //screen effects switched off (view, glitches), signal drops start off
  var effects = { drop: false }
  try {
    var chosen = JSON.parse(localStorage.getItem('effects')) || {}
    for (var id in chosen) effects[id] = chosen[id]
  } catch {
    //nothing saved
  }
  document.documentElement.dataset.effectsOff = Object.keys(effects)
    .filter(function (id) {
      return effects[id] === false
    })
    .join(' ')
} catch {
  //blocked storage keeps the defaults
}
//scanlines about 3 css pixels apart, but always a whole number of the screen's own pixels, so
//every line comes out alike; again whenever the pixel ratio changes (zoom, another screen)
var scanPeriod = function () {
  var ratio = window.devicePixelRatio || 1
  var period = Math.max(2, Math.round(3 * ratio)) / ratio
  document.documentElement.style.setProperty('--scan-period', period + 'px')
  if (window.matchMedia)
    matchMedia('(resolution: ' + ratio + 'dppx)').addEventListener('change', scanPeriod, {
      once: true,
    })
}
scanPeriod()
//if the game fails to start, show why instead of an empty desktop
addEventListener('error', (event) => {
  if (document.querySelector('main *')) return
  const note = document.createElement('pre')
  note.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:9;margin:0;padding:8px;background:#000;color:#fff;font:12px monospace;white-space:pre-wrap'
  note.textContent = `${document.title} could not start: ${event.message}`
  document.body.append(note)
})
