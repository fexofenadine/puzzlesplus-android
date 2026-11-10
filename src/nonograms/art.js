import { cluesOf } from './rules'
import { filled } from './generate'
import { rate } from './techniques'

//pictures are plain text files in art/<size>/<name>.txt: a header of key: value lines, ---, then
//a grid with # for a fill and . for empty
const files = import.meta.glob('./art/*/*.txt', { query: '?raw', import: 'default', eager: true })

const required = ['name', 'credit', 'licence']

//a picture from its text, or an error naming the file
export const parseArt = (path, text) => {
  const fail = (why) => {
    throw new Error(`${path}: ${why}`)
  }
  const [head, ...rest] = text.replace(/\r/g, '').split(/^---$/m)
  if (rest.length !== 1) fail('needs one --- line between the header and the grid')
  const info = {}
  for (const line of head.split('\n')) {
    const at = line.indexOf(':')
    if (line.trim() && at > 0) info[line.slice(0, at).trim()] = line.slice(at + 1).trim()
  }
  for (const key of required) if (!info[key]) fail(`missing ${key}`)
  const rows = rest[0]
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
  const n = rows.length
  if (n < 5 || n > 25) fail(`${n} rows, sizes go from 5 to 25`)
  if (rows.some((row) => row.length !== n || /[^#.]/.test(row))) fail('rows must be n of # or .')
  if (path.split('/').at(-2) !== String(n)) fail(`a ${n} × ${n} grid belongs in the ${n} folder`)
  const cells = Int8Array.from(rows.join(''), (c) => (c === '#' ? 1 : 0))
  if (!filled(cells, n)) fail('must touch every edge, and have no empty line up to 10 × 10')
  const id = path.replace(/^.*art\//, '').replace(/\.txt$/, '')
  return {
    id,
    n,
    cells,
    name: info.name,
    credit: info.credit,
    licence: info.licence,
    source: info.source ?? '',
  }
}

export const artFiles = files

//every picture that reads, a broken file is skipped here and caught by the tests
export const pool = Object.entries(files).flatMap(([path, text]) => {
  try {
    return [parseArt(path, text)]
  } catch {
    return []
  }
})

const levels = new Map()

//the easiest level that solves a picture by logic, null when it would need guessing
export const levelOf = (art) => {
  if (!levels.has(art.id)) levels.set(art.id, rate(cluesOf(art.cells, art.n), art.n))
  return levels.get(art.id)
}

//what a game keeps of its picture
export const infoOf = ({ id, name, credit, licence, source }) => ({
  id,
  name,
  credit,
  licence,
  source,
})

//the pictures a size has that logic can solve
export const artFor = (n) => pool.filter((art) => art.n === n && levelOf(art) !== null)

//a picture for size n: the one asked for by id, else one at the level (or the nearest level),
//avoiding the one just played; null when the size has none
export const pickArt = (n, level, rng, id = null, avoid = null) => {
  const all = artFor(n)
  let options = all.filter((art) => art.id === id)
  if (!options.length) {
    const others = all.length > 1 ? all.filter((art) => art.id !== avoid) : all
    const gap = (art) => Math.abs(levelOf(art) - level)
    const nearest = Math.min(...others.map(gap))
    options = others.filter((art) => gap(art) === nearest)
  }
  if (!options.length) return null
  const art = options[Math.floor(rng() * options.length)]
  return {
    solution: art.cells.slice(),
    clues: cluesOf(art.cells, art.n),
    level: levelOf(art),
    art: infoOf(art),
  }
}
