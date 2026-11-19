import { app } from '../platform'

//a shadertoy shader as a background, drawn with webgl2 on a canvas of its own
//it draws below the screen's size and at most 30 times a second, lowers its size further while a
//draw takes too long, and gives up for the theme's photo where even that is too much

const vertex = `#version 300 es
in vec2 corner;
void main() { gl_Position = vec4(corner, 0., 1.); }`

//shadertoy's inputs and entry point around the shader as it is
const fragmentOf = (shader) => `#version 300 es
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform float brightness;
out vec4 shade;
${shader}
void main() {
  mainImage(shade, gl_FragCoord.xy);
  shade = vec4(shade.rgb * brightness, 1.);
}`

//the least a frame is worth drawing at, as a share of the chosen size
const LOWEST = 0.3
//a draw that takes longer than this is too slow, in milliseconds, and at the lowest size one
//that takes longer than the second is not worth showing
const SLOW = 20
const HOPELESS = 45
//the gap between draws, and how many draws pass between timed ones once the size has settled
const GAP = 33
const CHECK = 150
//on the web the frames after the first second (page start up and the shader compiling stall it)
//are counted, and when the usual gap between them is longer than a tenth of a second the photo
//comes back; a median, so one stall such as a timed draw does not count against it
const SETTLE = 1000
const COUNT = 20
const LEAST_FPS = 10

//how many frames a second come at, from the median gap, null until enough have come
//a hidden tab or a long stall starts the count again rather than counting against it
export const frameRate = () => {
  let start = null
  let last = null
  let gaps = []
  return (now) => {
    if (last !== null && now - last > 1000) {
      start = now
      gaps = []
    }
    start ??= now
    if (last !== null && now - start > SETTLE) gaps.push(now - last)
    last = now
    if (gaps.length < COUNT) return null
    const sorted = [...gaps].sort((x, y) => x - y)
    return 1000 / sorted[COUNT >> 1]
  }
}

export const tooSlow = (fps) => fps !== null && fps < LEAST_FPS

//the next quality after a timed draw: lower while it is slow, null to give up
export const adapt = (quality, cost) => {
  if (cost <= SLOW) return quality
  if (quality <= LOWEST) return cost > HOPELESS ? null : quality
  return Math.max(LOWEST, quality * 0.7)
}

const compile = (gl, type, source) => {
  const made = gl.createShader(type)
  gl.shaderSource(made, source)
  gl.compileShader(made)
  if (!gl.getShaderParameter(made, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(made))
  return made
}

export const shaderBackground = (meta, shader) => ({
  ...meta,
  create: (gl, settings, { giveUp }) => {
    let options = settings
    const program = gl.createProgram()
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentOf(shader)))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('no program')
    //one triangle that covers the screen
    const triangle = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, triangle)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const corner = gl.getAttribLocation(program, 'corner')
    //the shaders share one context, so each takes it back when it is shown again
    const bind = () => {
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle)
      gl.enableVertexAttribArray(corner)
      gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0)
    }
    bind()
    const uniforms = {
      resolution: gl.getUniformLocation(program, 'iResolution'),
      time: gl.getUniformLocation(program, 'iTime'),
      brightness: gl.getUniformLocation(program, 'brightness'),
    }

    let width = 0
    let height = 0
    let quality = 1
    let clock = 0
    let last = 0
    //draws until the next timed one, the first few are all timed to settle the size quickly
    let untilCheck = 0
    let settled = 0
    //the first draws compile the shader on the graphics card, their time says nothing
    let warming = 2
    let lost = false
    //only the web checks the frame rate, the app always draws, and so do the screensaver and
    //wallpaper pages (data-always on the root), which keep drawing at the lowest size however slow
    const always = 'always' in (globalThis.document?.documentElement.dataset ?? {})
    let rate = app || always ? null : frameRate()
    const pixel = new Uint8Array(4)

    const size = () => {
      const scale = (options.resolution / 100) * quality
      gl.canvas.width = Math.max(64, Math.round(width * scale))
      gl.canvas.height = Math.max(36, Math.round(height * scale))
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    }

    gl.canvas.addEventListener('webglcontextlost', () => {
      lost = true
      giveUp(true)
    })

    return {
      configure: (next) => {
        const resize = next.resolution !== options.resolution
        options = next
        if (!width || !resize) return
        untilCheck = 0
        settled = 0
        size()
      },
      //the host gives the screen's size, the canvas is kept smaller and stretched over it
      resize: (w, h) => {
        bind()
        width = w
        height = h
        last = 0
        untilCheck = 0
        settled = 0
        size()
      },
      //how long a draw takes decides its size, reading a pixel back waits for the draw, so now
      //and then one is timed; on the web the first frames must also come at 10 a second
      frame: (now) => {
        if (lost) return
        //one verdict on the first frames is enough
        const fps = rate ? rate(now) : null
        if (fps !== null) rate = null
        if (tooSlow(fps)) return giveUp()
        if (!last) last = now - GAP
        const passed = now - last
        if (passed < GAP) return
        last = now
        clock += (Math.min(passed, 100) / 1000) * options.speed
        const timed = untilCheck-- <= 0
        const began = timed ? performance.now() : 0
        gl.uniform3f(uniforms.resolution, gl.canvas.width, gl.canvas.height, 1)
        gl.uniform1f(uniforms.time, clock)
        gl.uniform1f(uniforms.brightness, (options.brightness ?? 100) / 100)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        if (!timed) return
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
        const cost = performance.now() - began
        if (warming-- > 0) return
        gl.canvas.dataset.cost = Math.round(cost)
        const next = adapt(quality, cost) ?? (always ? quality : null)
        if (next === null) return giveUp()
        if (next !== quality) {
          quality = next
          settled = 0
          size()
        } else if (++settled >= 3) {
          untilCheck = CHECK
        }
      },
    }
  },
})
