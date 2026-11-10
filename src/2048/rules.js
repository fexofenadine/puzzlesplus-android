//boards of n * n cells in row order, 0 for empty else a power of two
//tiles carry ids so the view can slide them: { id, value, cell, fresh, merged, gone }

export const sizes = [3, 4, 5]

//the tile that wins: 2048 can't be reached on 3x3, so it aims lower
export const targets = { 3: 512, 4: 2048, 5: 2048 }

export const directions = ['left', 'right', 'up', 'down']

export const arrows = { left: '←', right: '→', up: '↑', down: '↓' }

const lineCache = {}

//each line's cells for a move, ordered from the edge the tiles slide towards
export const linesOf = (n, dir) =>
  (lineCache[`${n}${dir}`] ??= Array.from({ length: n }, (_, a) =>
    Array.from({ length: n }, (_, b) => {
      const k = dir === 'right' || dir === 'down' ? n - 1 - b : b
      return dir === 'left' || dir === 'right' ? a * n + k : k * n + a
    }),
  ))

//a move on plain values, for the search: { values, score, moved, merges }
//merges lists each merged value, a tile merges once per move as in the original
export const slide = (values, n, dir) => {
  const out = new Array(n * n).fill(0)
  let score = 0
  const merges = []
  for (const cells of linesOf(n, dir)) {
    let pos = 0
    let open = false
    for (const c of cells) {
      const v = values[c]
      if (!v) continue
      if (open && out[cells[pos - 1]] === v) {
        out[cells[pos - 1]] = v * 2
        score += v * 2
        merges.push(v * 2)
        open = false
      } else {
        out[cells[pos++]] = v
        open = true
      }
    }
  }
  const moved = out.some((v, i) => v !== values[i])
  return { values: out, score, moved, merges }
}

//the values the live tiles show
export const valuesOf = (tiles, n) => {
  const values = new Array(n * n).fill(0)
  for (const t of tiles) if (!t.gone) values[t.cell] = t.value
  return values
}

//a move on tiles, so each slides from where it was: the same result as slide, with ids kept
export const move = (tiles, n, dir, nextId) => {
  const at = new Map()
  for (const t of tiles) if (!t.gone) at.set(t.cell, t)
  const out = []
  let score = 0
  let moved = false
  let id = nextId
  for (const cells of linesOf(n, dir)) {
    let pos = 0
    let last = null
    for (const c of cells) {
      const t = at.get(c)
      if (!t) continue
      if (last && !last.merged && last.value === t.value) {
        //both slide into the cell and a new tile of twice the value takes their place
        const cell = last.cell
        last.gone = true
        out.push({ ...t, cell, fresh: false, merged: false, gone: true })
        const made = { id: id++, value: t.value * 2, cell, fresh: false, merged: true, gone: false }
        out.push(made)
        score += made.value
        moved = true
        last = made
      } else {
        const cell = cells[pos++]
        if (cell !== t.cell) moved = true
        const kept = { ...t, cell, fresh: false, merged: false, gone: false }
        out.push(kept)
        last = kept
      }
    }
  }
  return { tiles: out, score, moved, nextId: id }
}

export const empties = (values) => values.flatMap((v, i) => (v ? [] : [i]))

//a 2 nine times in ten, else a 4, in a random empty cell
export const spawn = (tiles, n, rng, nextId) => {
  const free = empties(valuesOf(tiles, n))
  if (!free.length) return { tiles, nextId }
  const cell = free[Math.floor(rng() * free.length)]
  const value = rng() < 0.9 ? 2 : 4
  return {
    tiles: [...tiles, { id: nextId, value, cell, fresh: true, merged: false, gone: false }],
    nextId: nextId + 1,
  }
}

//tiles for values, with no history to slide from
export const tilesOf = (values, nextId) => {
  let id = nextId
  const tiles = []
  values.forEach((value, cell) => {
    if (value) tiles.push({ id: id++, value, cell, fresh: false, merged: false, gone: false })
  })
  return { tiles, nextId: id }
}

//any move left: an empty cell or two equal neighbours
export const canMove = (values, n) => {
  for (let i = 0; i < n * n; i++) {
    if (!values[i]) return true
    if (i % n < n - 1 && values[i] === values[i + 1]) return true
    if (i + n < n * n && values[i] === values[i + n]) return true
  }
  return false
}

export const highest = (values) => Math.max(0, ...values)
