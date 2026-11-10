//the matrix rain's glowing glyph, drawn by the rain and by the games' rain glyphs

//each sprite is padded to hold a glyph plus the glow around it
export const PAD = 1.6

export const GLYPH = '#2cff6e'
export const BRIGHT = '#d4ffe0'

//one mirrored glowing glyph centred at x, y in a cell sized sprite
export const drawGlyph = (context, glyph, x, y, cell, colour) => {
  context.save()
  context.font = `${Math.round((cell / PAD) * 0.8)}px monospace`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = colour
  context.shadowColor = colour
  context.translate(x, y)
  context.scale(-1, 1)
  //a wide soft halo then a tighter one for a phosphor glow
  context.shadowBlur = cell * 0.3
  context.fillText(glyph, 0, 0)
  context.fillText(glyph, 0, 0)
  context.shadowBlur = cell * 0.07
  context.fillText(glyph, 0, 0)
  context.restore()
}

//a single rain glyph as an image url, for other pages to draw with, null without canvas
export const glyphImage = (glyph, cell, colour = GLYPH) => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = cell
  const context = canvas.getContext('2d')
  if (!context) return null
  drawGlyph(context, glyph, cell / 2, cell / 2, cell, colour)
  return canvas.toDataURL()
}
