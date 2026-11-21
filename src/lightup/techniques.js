import {
  BLANK,
  BULB,
  CROSS,
  EMPTY,
  WHITE,
  besideOf,
  cellName,
  darkLeft,
  litOf,
  sightsOf,
} from './rules'
import { plural } from '../shell/grid'
import { settle } from './solver'

//the solving techniques people use, easiest first; a board's level is the hardest it needs
//each gives steps { technique, level, place: [[cell, BULB or CROSS]], sources, text }
//text is only worked out when asked for, grading a board never reads it

export const levels = ['easy', 'medium', 'hard', 'expert']

const step = (technique, level, place, sources, say) => ({
  technique,
  level,
  place,
  sources,
  get text() {
    return say()
  },
})

//what every technique reads off a board: the lit cells, and the free ones, where a bulb could
//still go (white, empty and dark)
const read = (layout, board, n) => {
  const lit = litOf(layout, board, n)
  const free = (i) => layout[i] === WHITE && board[i] === EMPTY && !lit[i]
  return { lit, free, sights: sightsOf(layout, n), beside: besideOf(n) }
}

//each numbered wall with its bulbs so far and the free cells beside it
const walls = (layout, board, n, { free, beside }) => {
  const list = []
  for (let i = 0; i < n * n; i++) {
    if (layout[i] === WHITE || layout[i] === BLANK) continue
    const around = beside[i].filter((c) => layout[c] === WHITE)
    list.push({
      wall: i,
      number: layout[i],
      bulbs: around.filter((c) => board[c] === BULB),
      open: around.filter(free),
    })
  }
  return list
}

//each dark cell with the free cells that could light it, itself among them when it is free
const darks = (layout, board, n, { lit, free, sights }) => {
  const list = []
  for (let i = 0; i < n * n; i++) {
    if (layout[i] !== WHITE || lit[i]) continue
    list.push({ dark: i, places: [...(free(i) ? [i] : []), ...sights[i].filter(free)] })
  }
  return list
}

//a wall that has its bulbs: the cells left beside it hold none
export const full = (layout, board, n) => {
  const view = read(layout, board, n)
  return walls(layout, board, n, view)
    .filter(({ number, bulbs, open }) => bulbs.length === number && open.length)
    .map(({ wall, number, bulbs, open }) =>
      step(
        'full',
        0,
        open.map((c) => [c, CROSS]),
        [wall, ...bulbs],
        () =>
          number
            ? `The ${number} at ${cellName(wall, n)} has its ${plural(number, 'bulb')}, so no other cell beside it holds one.`
            : `The 0 at ${cellName(wall, n)} takes no bulbs, so no cell beside it holds one.`,
      ),
    )
}

//a wall that needs every free cell beside it
export const need = (layout, board, n) => {
  const view = read(layout, board, n)
  return walls(layout, board, n, view)
    .filter(({ number, bulbs, open }) => open.length && bulbs.length + open.length === number)
    .map(({ wall, number, bulbs, open }) =>
      step(
        'need',
        0,
        open.map((c) => [c, BULB]),
        [wall, ...bulbs],
        () =>
          `The ${number} at ${cellName(wall, n)} needs ${plural(number - bulbs.length, 'more bulb')} and has just ${plural(open.length, 'free cell')} beside it, so ${open.length === 1 ? 'it holds a bulb' : 'each holds a bulb'}.`,
      ),
    )
}

//a dark cell nothing else can light holds a bulb itself
export const boxed = (layout, board, n) => {
  const view = read(layout, board, n)
  return darks(layout, board, n, view)
    .filter(({ dark, places }) => places.length === 1 && places[0] === dark)
    .map(({ dark }) =>
      step(
        'boxed',
        0,
        [[dark, BULB]],
        [],
        () =>
          `No other free cell can light the cell at ${cellName(dark, n)}, so it holds a bulb itself.`,
      ),
    )
}

//a dark cell only one other cell can still light: the bulb goes there
export const lone = (layout, board, n) => {
  const view = read(layout, board, n)
  const seen = new Set()
  return darks(layout, board, n, view)
    .filter(({ dark, places }) => places.length === 1 && places[0] !== dark)
    .filter(({ places }) => !seen.has(places[0]) && seen.add(places[0]))
    .map(({ dark, places }) =>
      step(
        'lone',
        1,
        [[places[0], BULB]],
        [dark],
        () =>
          `The cell at ${cellName(dark, n)} is dark and can't hold a bulb, and only one free cell can still light it, so the bulb goes there.`,
      ),
    )
}

//a bulb that would light too many of the free cells beside a wall, leaving it short
export const squeeze = (layout, board, n) => {
  const view = read(layout, board, n)
  const { free, sights } = view
  const steps = []
  const crossed = new Set()
  for (const { wall, number, bulbs, open } of walls(layout, board, n, view)) {
    const wanted = number - bulbs.length
    if (wanted <= 0 || open.length <= wanted) continue
    //only cells in line with a free cell beside the wall can take any of them away
    const near = new Set(open.flatMap((c) => sights[c]))
    for (const c of near) {
      if (!free(c) || open.includes(c) || crossed.has(c)) continue
      const taken = open.filter((o) => sights[c].includes(o))
      if (open.length - taken.length >= wanted) continue
      crossed.add(c)
      steps.push(
        step(
          'squeeze',
          2,
          [[c, CROSS]],
          [wall, ...taken],
          () =>
            `A bulb here would light ${plural(taken.length, 'free cell')} beside the ${number} at ${cellName(wall, n)}, leaving it too few for ${plural(wanted, 'more bulb')}, so this cell holds none.`,
        ),
      )
    }
  }
  return steps
}

//a bulb that would light every cell a dark cell could be lit from, without lighting the cell
export const starve = (layout, board, n) => {
  const view = read(layout, board, n)
  const { free, sights } = view
  const steps = []
  const crossed = new Set()
  for (const { dark, places } of darks(layout, board, n, view)) {
    if (places.length < 2) continue
    //such a bulb is in line with every place, so the first place's sight holds all of them
    for (const c of sights[places[0]]) {
      if (!free(c) || crossed.has(c) || places.includes(c)) continue
      if (!places.every((p) => sights[c].includes(p))) continue
      crossed.add(c)
      steps.push(
        step(
          'starve',
          2,
          [[c, CROSS]],
          [dark, ...places],
          () =>
            `A bulb here would light every cell that could still light the cell at ${cellName(dark, n)}, and leave it dark for good, so this cell holds none.`,
        ),
      )
    }
  }
  return steps
}

const broke = (why, layout, n) =>
  why.wall !== undefined
    ? `the ${layout[why.wall]} at ${cellName(why.wall, n)} could not be met`
    : `the cell at ${cellName(why.dark, n)} could not be lit properly`

//what if: a cell is tried as a bulb, then as no bulb; when the plain rules then break one,
//the cell is the other
export const whatIf = (layout, board, n) => {
  const { free } = read(layout, board, n)
  for (let i = 0; i < n * n; i++) {
    if (!free(i)) continue
    for (const value of [BULB, CROSS]) {
      const trial = board.slice()
      trial[i] = value
      const why = {}
      if (settle(layout, n, trial, why)) continue
      const sources = [why.wall !== undefined ? why.wall : why.dark]
      return [
        step('what-if', 3, [[i, value === BULB ? CROSS : BULB]], sources, () =>
          value === BULB
            ? `If this cell held a bulb, following the plain rules from there, ${broke(why, layout, n)}. So it holds none.`
            : `If this cell held no bulb, following the plain rules from there, ${broke(why, layout, n)}. So it holds a bulb.`,
        ),
      ]
    }
  }
  return []
}

const techniques = [[need, full, boxed], [lone], [squeeze, starve], [whatIf]]

//the easiest steps a board offers, using techniques up to a level
export const nextSteps = (layout, board, n, top = levels.length - 1) => {
  for (let level = 0; level <= top; level++) {
    for (const technique of techniques[level]) {
      const steps = technique(layout, board, n)
      if (steps.length) return { level, steps }
    }
  }
  return { steps: [] }
}

//puts steps on a board in place, false when one lands on a cell that already holds the other mark
export const apply = (board, steps) => {
  for (const { place } of steps) {
    for (const [i, value] of place) {
      if (board[i] !== EMPTY && board[i] !== value) return false
      board[i] = value
    }
  }
  return true
}

//the hardest level a layout needs and its solution, or null when techniques up to top can't
//finish it; the steps are sound, so finishing proves the solution is the only one
export const rate = (layout, n, top = levels.length - 1) => {
  const board = new Int8Array(n * n).fill(EMPTY)
  let hardest = 0
  while (darkLeft(layout, board, n)) {
    const { level, steps } = nextSteps(layout, board, n, top)
    if (!steps.length || !apply(board, steps)) return null
    hardest = Math.max(hardest, level)
  }
  //every cell is lit; the numbers and the bulbs' lines are checked by the plain rules
  if (!settle(layout, n, board.slice())) return null
  return { level: hardest, solution: Int8Array.from(board, (v) => (v === BULB ? 1 : 0)) }
}
