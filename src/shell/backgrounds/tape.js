//vaporwave's tape counter, kept by whichever of its backgrounds is playing

//the counter's text, from seconds played
export const tape = (seconds) => {
  const two = (value) => String(value).padStart(2, '0')
  return `${Math.floor(seconds / 3600)}:${two(Math.floor(seconds / 60) % 60)}:${two(seconds % 60)}`
}

//adds milliseconds played and shows the counter through the theme's styles, once a second
export const tapeCounter = () => {
  let played = 0
  let shown = -1
  return (passed) => {
    played += passed
    const seconds = Math.floor(played / 1000)
    if (seconds === shown) return
    shown = seconds
    document.documentElement.style.setProperty('--tape', `'SP  ${tape(seconds)}'`)
  }
}
