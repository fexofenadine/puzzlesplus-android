import { neon as meta } from './meta'
import { shaderBackground } from './shader'
import shader from './neontriangulator.glsl?raw'

//mrange's neon triangulator, the shadertoy shader xscreensaver wraps
export { adapt } from './shader'

export default shaderBackground(meta, shader)
