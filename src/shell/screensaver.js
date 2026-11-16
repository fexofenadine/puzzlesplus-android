//the paused screen's background on its own, as a screensaver, until a click, tap or key
//only the page changes: the game stays paused underneath and its pause window comes back

const ends = ['pointerdown', 'keydown']

export const showScreensaver = () => {
  const root = document.documentElement
  if ('screensaver' in root.dataset) return
  root.dataset.screensaver = ''
  //the press that ends it does nothing else, nor its click
  const swallow = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }
  const end = (event) => {
    swallow(event)
    for (const name of ends) window.removeEventListener(name, end, true)
    delete root.dataset.screensaver
    if (event.type === 'pointerdown') {
      window.addEventListener('click', swallow, { capture: true, once: true })
      //a press with no click after it must not eat the next one
      setTimeout(() => window.removeEventListener('click', swallow, true), 600)
    }
  }
  //the click that opened it is still on its way, so listening starts after it
  setTimeout(() => {
    for (const name of ends) window.addEventListener(name, end, true)
  })
}
