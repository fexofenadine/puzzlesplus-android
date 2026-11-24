import { pastelclouds as meta } from './meta'
import { shaderBackground } from './shader'
import clouds from './driftclouds.glsl?raw'
import { tapeCounter } from './tape'

//drift's 2d clouds again, with vaporwave's pastels in place of the blue sky and white clouds
//the sky runs from vaporwave's purple at the top to its pink near the floor (the user's pick, C)
const swaps = [
  ['skycolour1 = vec3(0.2, 0.4, 0.6)', 'skycolour1 = vec3(0.66, 0.45, 1.0)'],
  ['skycolour2 = vec3(0.4, 0.7, 1.0)', 'skycolour2 = vec3(1.0, 0.55, 0.85)'],
  ['vec3(1.1, 1.1, 0.9)', 'vec3(1.12, 0.98, 1.15)'],
]

//a swap that no longer matches would quietly leave the sky blue, so it fails loudly instead
export const pastel = (source) =>
  swaps.reduce((text, [from, to]) => {
    if (!text.includes(from)) throw new Error(`pastel clouds: no ${from}`)
    return text.replace(from, to)
  }, source)

const base = shaderBackground(meta, pastel(clouds))

//the clouds keep the tape counter going, as qix does
export default {
  ...base,
  create: (gl, settings, host) => {
    const drawn = base.create(gl, settings, host)
    const count = tapeCounter()
    let last = 0
    return {
      ...drawn,
      frame: (now) => {
        if (last) count(Math.min(250, now - last))
        last = now
        drawn.frame(now)
      },
    }
  },
}
