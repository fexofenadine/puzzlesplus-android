//inlined into each game's page head by vite.config.js, so it runs before first paint
//apply the saved theme and window size before first paint
try {
  //everforest became terafox coral
  document.documentElement.dataset.theme = (localStorage.getItem('theme') || 'classic').replace(
    /^everforest$/,
    'terafox-coral',
  )
  //assume animated off classic, the script corrects it; synthwave's is on unless switched off
  //since its default changed (settings version 1)
  var theme = document.documentElement.dataset.theme
  var animated = theme !== 'classic'
  if (theme === 'synthwave') {
    try {
      var saved = JSON.parse(localStorage.getItem('backgrounds'))
      animated = !(saved.version >= 1 && saved.neon.animated === false)
    } catch {
      //nothing saved, the shader is on
    }
  }
  if (animated) document.documentElement.dataset.background = 'animated'
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
