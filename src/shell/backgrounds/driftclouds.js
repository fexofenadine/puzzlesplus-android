import { driftclouds as meta } from './meta'
import { shaderBackground } from './shader'
import shader from './driftclouds.glsl?raw'

//drift's 2d clouds, the shadertoy shader xscreensaver wraps as drift clouds
export default shaderBackground(meta, shader)
