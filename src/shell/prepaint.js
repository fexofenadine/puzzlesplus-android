//inlined into each game's page head by vite.config.js, so it runs before first paint
//apply the saved theme and window size before first paint
try {
  //everforest became terafox coral
  document.documentElement.dataset.theme = (localStorage.getItem('theme') || 'classic').replace(
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
  //a motion choice overrules the system's from the first paint
  var motion = localStorage.getItem('motion')
  if (motion === 'reduce' || motion === 'full') document.documentElement.dataset.motion = motion
  document.documentElement.style.setProperty('--scale', localStorage.getItem('scale') || 1)
} catch {
  //blocked storage keeps the defaults
}
//if the game fails to start, show why instead of an empty desktop
addEventListener('error', (event) => {
  if (document.querySelector('main *')) return
  const note = document.createElement('pre')
  note.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:9;margin:0;padding:8px;background:#000;color:#fff;font:12px monospace;white-space:pre-wrap'
  note.textContent = `${document.title} could not start: ${event.message}`
  document.body.append(note)
})
