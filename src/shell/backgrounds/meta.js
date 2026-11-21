import { app } from '../platform'

//what the host and the settings dialog need to know about each background without loading it
//{ name, credit, options, ratio(dpr, settings), filter?(dpr), wallpaper?, animated? }

//the defaults are the look the matrix theme was tuned with
export const matrix = {
  name: 'GLMatrix',
  credit: 'Ported from GLMatrix by Jamie Zawinski, part of xscreensaver',
  //turned off, the theme shows its digital rain photo
  wallpaper: true,
  //0.6 screen pixels of blur at any pixel ratio
  filter: (pixels) => `blur(${0.6 / pixels}px)`,
  //up to 2x keeps glyphs crisp without overdrawing
  ratio: (pixels) => Math.min(pixels, 2),
  options: [
    { key: 'density', label: 'Density', type: 'range', min: 10, max: 100, step: 1, value: 44 },
    {
      key: 'speed',
      label: 'Speed',
      type: 'range',
      min: 0.25,
      max: 3,
      step: 0.25,
      value: 1,
      format: (v) => `${v}×`,
    },
    {
      key: 'encoding',
      label: 'Glyphs',
      type: 'select',
      choices: [
        ['matrix', 'Matrix'],
        ['binary', 'Binary'],
        ['hexadecimal', 'Hexadecimal'],
        ['decimal', 'Decimal'],
        ['dna', 'DNA'],
      ],
      value: 'matrix',
    },
    { key: 'fog', label: 'Fog', type: 'toggle', value: true },
    { key: 'waves', label: 'Waves', type: 'toggle', value: true },
  ],
}

export const substrate = {
  name: 'Substrate',
  credit: 'Ported from Substrate by J. Tarbell and Mike Kershaw, part of xscreensaver',
  //original is 1x, sharp the screen's pixels, balanced up to 1.5x
  ratio: (pixels, { detail }) =>
    detail === 'sharp' ? pixels : detail === 'balanced' ? Math.min(pixels, 1.5) : 1,
  options: [
    {
      key: 'growthDelay',
      label: 'Growth delay',
      type: 'range',
      min: 0,
      max: 50,
      step: 1,
      value: 18,
      format: (v) => `${v} ms`,
    },
    {
      key: 'initialCracks',
      label: 'Initial cracks',
      type: 'range',
      min: 3,
      max: 20,
      step: 1,
      value: 3,
    },
    {
      key: 'maxCracks',
      label: 'Max cracks',
      type: 'range',
      min: 11,
      max: 300,
      step: 1,
      value: 100,
    },
    {
      key: 'sandGrains',
      label: 'Sand grains',
      type: 'range',
      min: 2,
      max: 256,
      step: 1,
      value: 64,
    },
    {
      key: 'circlePercent',
      label: 'Circular cracks',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      value: 33,
      format: (v) => `${v}%`,
    },
    {
      key: 'maxCycles',
      label: 'Restart after',
      type: 'range',
      min: 0,
      max: 50000,
      step: 1000,
      value: 10000,
      format: (v) => (v ? `${v} cycles` : 'never'),
    },
    {
      key: 'palette',
      label: 'Colours',
      type: 'select',
      choices: [
        ['nord', 'Frost and aurora'],
        ['frost', 'Frost'],
        ['aurora', 'Aurora'],
      ],
      value: 'nord',
    },
    { key: 'wireframe', label: 'Wireframe', type: 'toggle', value: false },
    { key: 'seamless', label: 'Seamless', type: 'toggle', value: false },
    {
      key: 'detail',
      label: 'Detail',
      type: 'select',
      choices: [
        ['balanced', 'Balanced'],
        ['sharp', 'Sharp (slow on big screens)'],
        ['original', 'Original'],
      ],
      value: 'balanced',
    },
  ],
}

export const truchet = {
  name: 'Truchet',
  credit: 'Ported from Truchet by Adrian Likins, part of xscreensaver',
  wallpaper: true,
  ratio: (pixels) => pixels,
  //xscreensaver's options with calmer defaults
  options: [
    {
      key: 'minWidth',
      label: 'Smallest tile',
      type: 'range',
      min: 12,
      max: 256,
      step: 4,
      value: 40,
    },
    {
      key: 'maxWidth',
      label: 'Largest tile',
      type: 'range',
      min: 12,
      max: 512,
      step: 4,
      value: 150,
    },
    {
      key: 'minLineWidth',
      label: 'Thinnest line',
      type: 'range',
      min: 1,
      max: 48,
      step: 1,
      value: 2,
    },
    {
      key: 'maxLineWidth',
      label: 'Thickest line',
      type: 'range',
      min: 2,
      max: 96,
      step: 1,
      value: 25,
    },
    { key: 'curves', label: 'Curves', type: 'toggle', value: true },
    { key: 'angles', label: 'Angles', type: 'toggle', value: true },
    { key: 'square', label: 'Square tiles', type: 'toggle', value: true },
    { key: 'erase', label: 'Erase each pattern', type: 'toggle', value: true },
    {
      key: 'eraseCount',
      label: 'Layers before erasing',
      type: 'range',
      min: 2,
      max: 50,
      step: 1,
      value: 25,
    },
    { key: 'scroll', label: 'Scroll', type: 'toggle', value: true },
    {
      key: 'delay',
      label: 'Pattern delay',
      type: 'range',
      min: 0.2,
      max: 20,
      step: 0.2,
      value: 6,
      format: (v) => `${v} s`,
    },
    {
      key: 'animDelay',
      label: 'Scroll step delay',
      type: 'range',
      min: 10,
      max: 200,
      step: 5,
      value: 30,
      format: (v) => `${v} ms`,
    },
    {
      key: 'animStep',
      label: 'Scroll step size',
      type: 'range',
      min: 1,
      max: 9,
      step: 1,
      value: 1,
    },
    {
      key: 'palette',
      label: 'Colours',
      type: 'select',
      choices: [
        ['accents', 'All accents'],
        ['cool', 'Violet to green'],
        ['warm', 'Yellow to magenta'],
        ['base', 'Base tones'],
      ],
      value: 'accents',
    },
    {
      key: 'opacity',
      label: 'Line strength',
      type: 'range',
      min: 10,
      max: 100,
      step: 5,
      value: 45,
      format: (v) => `${v}%`,
    },
  ],
}

export const phosphor = {
  name: 'Phosphor',
  credit: 'Ported from Phosphor by Jamie Zawinski, part of xscreensaver',
  wallpaper: true,
  ratio: (pixels) => pixels,
  options: [
    { key: 'scale', label: 'Scale', type: 'range', min: 2, max: 12, step: 1, value: 2 },
    { key: 'ticks', label: 'Fade', type: 'range', min: 4, max: 40, step: 1, value: 20 },
    {
      key: 'delay',
      label: 'Typing delay',
      type: 'range',
      min: 10,
      max: 200,
      step: 5,
      value: 50,
      format: (v) => `${v} ms`,
    },
    {
      key: 'cursor',
      label: 'Cursor blink',
      type: 'range',
      min: 100,
      max: 1000,
      step: 1,
      value: 333,
      format: (v) => `${v} ms`,
    },
    {
      key: 'colour',
      label: 'Colour',
      type: 'select',
      choices: [
        ['cyan', 'Cyan'],
        ['base1', 'Grey'],
        ['green', 'Green'],
        ['yellow', 'Yellow'],
        ['blue', 'Blue'],
        ['violet', 'Violet'],
      ],
      value: 'cyan',
    },
    //not in the original, keeps the text behind the game
    {
      key: 'brightness',
      label: 'Brightness',
      type: 'range',
      min: 10,
      max: 100,
      step: 5,
      value: 20,
      format: (v) => `${v}%`,
    },
  ],
}

export const qix = {
  name: 'Qix',
  credit:
    'After Qix by Jamie Zawinski, part of xscreensaver, and the Mystify screensaver of Windows 95',
  //the lines play over the theme's wallpaper, which stays when they are switched off
  wallpaper: true,
  ratio: (pixels) => Math.min(pixels, 2),
  options: [
    {
      key: 'speed',
      label: 'Speed',
      type: 'range',
      min: 0.25,
      max: 3,
      step: 0.25,
      value: 0.6,
      format: (v) => `${v}×`,
    },
    { key: 'count', label: 'Shapes', type: 'range', min: 0, max: 5, step: 1, value: 2 },
    { key: 'corners', label: 'Corners', type: 'range', min: 2, max: 6, step: 1, value: 4 },
    { key: 'trail', label: 'Trail', type: 'range', min: 2, max: 40, step: 1, value: 18 },
    {
      key: 'bleed',
      label: 'Colour bleed',
      type: 'range',
      min: 0,
      max: 8,
      step: 1,
      value: 3,
      format: (v) => (v ? `${v} px` : 'none'),
    },
    {
      key: 'opacity',
      label: 'Strength',
      type: 'range',
      min: 20,
      max: 100,
      step: 5,
      value: 80,
      format: (v) => `${v}%`,
    },
  ],
}

export const hextrail = {
  name: 'Hex Trail',
  credit: 'Ported from HexTrail by Jamie Zawinski, part of xscreensaver',
  ratio: (pixels) => Math.min(pixels, 2),
  options: [
    {
      key: 'speed',
      label: 'Speed',
      type: 'range',
      min: 0.25,
      max: 4,
      step: 0.25,
      value: 1,
      format: (v) => `${v}×`,
    },
    { key: 'size', label: 'Hexagon size', type: 'range', min: 12, max: 80, step: 1, value: 15 },
    {
      key: 'thickness',
      label: 'Thickness',
      type: 'range',
      min: 5,
      max: 50,
      step: 1,
      value: 10,
      format: (v) => `${v}%`,
    },
    //the original outlines each hexagon as a line reaches it
    { key: 'borders', label: 'Hexagon outlines', type: 'toggle', value: true },
    {
      key: 'palette',
      label: 'Colours',
      type: 'select',
      choices: [
        ['sea', 'Sea greens and blues'],
        ['teal', 'Teals'],
        ['ember', 'Embers'],
      ],
      value: 'sea',
    },
    {
      key: 'opacity',
      label: 'Strength',
      type: 'range',
      min: 20,
      max: 100,
      step: 5,
      value: 70,
      format: (v) => `${v}%`,
    },
  ],
}

//the shaders draw with webgl2 on a canvas of their own, at full size in the app and below it on
//the web, where a draw also has to keep up or the theme falls back to its photo
const resolution = (web) => ({
  key: 'resolution',
  label: 'Resolution',
  type: 'range',
  min: 20,
  max: 100,
  step: 5,
  value: app ? 100 : web,
  format: (v) => `${v}%`,
})

const speed = (value) => ({
  key: 'speed',
  label: 'Speed',
  type: 'range',
  min: 0.1,
  max: 2,
  step: 0.1,
  value,
  format: (v) => `${v}×`,
})

//how many frames a second at most; a slow draw may still stretch the gap, and fewer frames a second
//leave time for a larger picture
const fps = {
  key: 'fps',
  label: 'Frame rate',
  type: 'range',
  min: 10,
  max: 30,
  step: 5,
  value: 30,
  format: (v) => `${v} fps`,
}

export const neon = {
  name: 'Neon Triangulator',
  credit: 'Neon Triangulator by mrange (CC0, shadertoy.com/view/tXGGRD), as in xscreensaver',
  gl: true,
  //turned off, or where the shader is too much for the device, the theme shows its photo
  wallpaper: true,
  ratio: () => 1,
  options: [
    speed(0.2),
    resolution(65),
    fps,
    {
      key: 'brightness',
      label: 'Brightness',
      type: 'range',
      min: 20,
      max: 100,
      step: 5,
      value: 75,
      format: (v) => `${v}%`,
    },
  ],
}

//classic's opt-in sky, over the original photo until it is switched on
export const driftclouds = {
  name: 'Drift Clouds',
  credit:
    '2D Clouds by drift (shadertoy.com/view/4tdSWr, free to use), as Drift Clouds in xscreensaver',
  gl: true,
  wallpaper: true,
  animated: false,
  ratio: () => 1,
  options: [speed(1), resolution(50), fps],
}
