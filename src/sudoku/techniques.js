import {
  EMPTY,
  all,
  bit,
  candidatesOf,
  capital,
  countBits,
  digitsOf,
  full,
  geometry,
  onlyDigit,
} from './rules'
import { settle } from './solver'

//the reasoning a person uses, easiest first, behind hints, difficulty and generation
//a step is { technique, level, place: [[cell, digit]], remove: [[cell, mask]], sources, text }
//steps work on candidates, the digits each empty cell may still hold

export const levels = ['easy', 'medium', 'hard', 'expert']

const words = ['no', 'one', 'two', 'three', 'four']

//3 and 7, or 3, 5 and 7
const listOf = (items) =>
  items.length < 2 ? `${items[0]}` : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

//3 or 7, or 3, 5 or 7
const orList = (items) => `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`

const step = (technique, level, { place = [], remove = [], sources = [] }, text) => ({
  technique,
  level,
  place,
  remove,
  sources,
  text,
})

const combinations = (list, k, start = 0, picked = [], out = []) => {
  if (picked.length === k) {
    out.push(picked.slice())
    return out
  }
  for (let i = start; i <= list.length - (k - picked.length); i++) {
    picked.push(list[i])
    combinations(list, k, i + 1, picked, out)
    picked.pop()
  }
  return out
}

//the cell holding digit d that rules it out of cell i, for showing why
const blocker = (board, n, i, d) => geometry(n).peers[i].find((p) => board[p] === d)

const unique = (list) => [...new Set(list.filter((x) => x !== undefined))]

//the candidates of cells taken away, only where there is something to take
const removals = (cands, cells, mask, keep = []) =>
  cells.filter((i) => !keep.includes(i) && cands[i] & mask).map((i) => [i, cands[i] & mask])

//the boxes first, since that is where people look first
const unitOrder = (n) => {
  const { units } = geometry(n)
  return [...units.filter((u) => u.kind === 'box'), ...units.filter((u) => u.kind !== 'box')]
}

//a digit with one place left in a row, column or box goes there
export const hiddenSingles = (board, cands, n) => {
  const steps = []
  const seen = new Set()
  for (const unit of unitOrder(n)) {
    for (let d = 1; d <= n; d++) {
      const spots = unit.cells.filter((i) => board[i] === EMPTY && cands[i] & bit(d))
      if (spots.length !== 1 || seen.has(spots[0])) continue
      const [i] = spots
      seen.add(i)
      const others = unit.cells.filter((c) => c !== i && board[c] === EMPTY)
      steps.push(
        step(
          'hidden-single',
          0,
          { place: [[i, d]], sources: unique(others.map((c) => blocker(board, n, c, d))) },
          `${d} can only go in one cell of ${unit.name}, so it goes here.`,
        ),
      )
    }
  }
  return steps
}

//a cell with one candidate left holds it
export const nakedSingles = (board, cands, n) => {
  const steps = []
  for (let i = 0; i < board.length; i++) {
    const mask = cands[i]
    if (board[i] !== EMPTY || !mask || mask & (mask - 1)) continue
    const d = onlyDigit(mask)
    const others = digitsOf(all(n) & ~mask)
    const sources = unique(others.map((o) => blocker(board, n, i, o)))
    const plain = sources.length === others.length
    steps.push(
      step(
        'naked-single',
        0,
        { place: [[i, d]], sources },
        plain
          ? `Every other digit is already in this cell's row, column or box, so it must be ${d}.`
          : `Only ${d} is left as a candidate for this cell, so it must be ${d}.`,
      ),
    )
  }
  return steps
}

//a digit kept to one line inside a box, or to one box inside a line, can't go elsewhere in the other
export const lockedCandidates = (board, cands, n) => {
  const { units, unitsOf } = geometry(n)
  const steps = []
  for (const unit of units) {
    for (let d = 1; d <= n; d++) {
      const spots = unit.cells.filter((i) => board[i] === EMPTY && cands[i] & bit(d))
      if (spots.length < 2) continue
      //the other units every spot shares
      const shared = unitsOf[spots[0]].filter(
        (other) => other !== unit && spots.every((i) => other.cells.includes(i)),
      )
      for (const other of shared) {
        //box to line is pointing, line to box is claiming
        if ((unit.kind === 'box') === (other.kind === 'box')) continue
        const remove = removals(cands, other.cells, bit(d), spots)
        if (!remove.length) continue
        const pointing = unit.kind === 'box'
        steps.push(
          step(
            pointing ? 'pointing' : 'claiming',
            1,
            { remove, sources: spots },
            `In ${unit.name}, ${d} can only go in ${other.name}, so ${d} can't go anywhere else in ${other.name}.`,
          ),
        )
      }
    }
  }
  return steps
}

//k cells of a unit holding only k digits between them: those digits are theirs
const nakedSubsets = (k, level) => (board, cands, n) => {
  const steps = []
  for (const unit of geometry(n).units) {
    const open = unit.cells.filter((i) => board[i] === EMPTY && countBits(cands[i]) <= k)
    for (const cells of combinations(open, k)) {
      const mask = cells.reduce((m, i) => m | cands[i], 0)
      if (countBits(mask) !== k) continue
      const remove = removals(cands, unit.cells, mask, cells)
      if (!remove.length) continue
      steps.push(
        step(
          `naked-${['', '', 'pair', 'triple', 'quad'][k]}`,
          level,
          { remove, sources: cells },
          `These ${words[k]} cells in ${unit.name} can only hold ${listOf(digitsOf(mask))} between them, so those digits can't go anywhere else in ${unit.name}.`,
        ),
      )
    }
  }
  return steps
}

//k digits with only the same k cells of a unit to go in: those cells hold nothing else
const hiddenSubsets = (k, level) => (board, cands, n) => {
  const steps = []
  for (const unit of geometry(n).units) {
    const open = unit.cells.filter((i) => board[i] === EMPTY)
    const placed = unit.cells.reduce((m, i) => (board[i] ? m | bit(board[i]) : m), 0)
    const spotsOf = (d) => open.filter((i) => cands[i] & bit(d))
    const digits = digitsOf(all(n) & ~placed).filter((d) => {
      const count = spotsOf(d).length
      return count >= 2 && count <= k
    })
    for (const group of combinations(digits, k)) {
      const cells = unique(group.flatMap(spotsOf))
      if (cells.length !== k) continue
      const mask = group.reduce((m, d) => m | bit(d), 0)
      const remove = removals(cands, cells, ~mask & all(n))
      if (!remove.length) continue
      steps.push(
        step(
          `hidden-${['', '', 'pair', 'triple', 'quad'][k]}`,
          level,
          { remove, sources: cells },
          `${capital(listOf(group))} can only go in these ${words[k]} cells of ${unit.name}, so those cells can't hold anything else.`,
        ),
      )
    }
  }
  return steps
}

const fishNames = ['', '', 'x-wing', 'swordfish', 'jellyfish']

//k rows where a digit fits only in the same k columns: the digit fills those columns from
//these rows, so the columns' other cells lose it; and the same with rows and columns swapped
const fish = (k, level) => (board, cands, n) => {
  const { units } = geometry(n)
  const steps = []
  for (const [base, cover] of [
    ['row', 'column'],
    ['column', 'row'],
  ]) {
    const bases = units.filter((u) => u.kind === base)
    const covers = units.filter((u) => u.kind === cover)
    //the cover index of a cell, its column for a row base
    const along = (i) => (cover === 'column' ? i % n : Math.floor(i / n))
    for (let d = 1; d <= n; d++) {
      const lines = bases
        .map((unit) => ({ unit, spots: unit.cells.filter((i) => !board[i] && cands[i] & bit(d)) }))
        .filter(({ spots }) => spots.length >= 2 && spots.length <= k)
      for (const group of combinations(lines, k)) {
        const crossed = unique(group.flatMap(({ spots }) => spots.map(along))).sort((a, b) => a - b)
        if (crossed.length !== k) continue
        const spots = group.flatMap((line) => line.spots)
        const remove = crossed.flatMap((c) => removals(cands, covers[c].cells, bit(d), spots))
        if (!remove.length) continue
        const baseNames = listOf(group.map(({ unit }) => unit.index + 1))
        const coverNames = listOf(crossed.map((c) => c + 1))
        steps.push(
          step(
            fishNames[k],
            level,
            { remove, sources: spots },
            `In ${base}s ${baseNames}, ${d} can only go in ${cover}s ${coverNames}. Whichever cells it takes, it fills those ${cover}s, so ${d} can't go anywhere else in them.`,
          ),
        )
      }
    }
  }
  return steps
}

const sees = (n, a, b) => a !== b && geometry(n).peers[a].includes(b)

//a two candidate pivot whose digits each pair with z in a pincer it sees: one pincer is z,
//so no cell seeing both pincers can be
export const xyWing = (board, cands, n) => {
  const { peers } = geometry(n)
  const steps = []
  const pairs = [...board.keys()].filter((i) => !board[i] && countBits(cands[i]) === 2)
  for (const pivot of pairs) {
    const [x, y] = digitsOf(cands[pivot])
    const wings = peers[pivot].filter((p) => !board[p] && countBits(cands[p]) === 2)
    for (const a of wings) {
      if ((cands[a] & cands[pivot]) !== bit(x)) continue
      const z = onlyDigit(cands[a] & ~bit(x))
      for (const b of wings) {
        if (b === a || cands[b] !== (bit(y) | bit(z))) continue
        const targets = peers[a].filter((c) => c !== b && c !== pivot && sees(n, b, c))
        const remove = removals(cands, targets, bit(z))
        if (!remove.length) continue
        steps.push(
          step(
            'xy-wing',
            2,
            { remove, sources: [pivot, a, b] },
            `The middle cell is ${x} or ${y}. Either way one of the outer cells becomes ${z}, so no cell that sees both outer cells can be ${z}.`,
          ),
        )
      }
    }
  }
  return steps
}

//a three candidate pivot with pincers xz and yz: one of the three is z, so no cell seeing all
//three can be
export const xyzWing = (board, cands, n) => {
  const { peers } = geometry(n)
  const steps = []
  for (let pivot = 0; pivot < board.length; pivot++) {
    if (board[pivot] || countBits(cands[pivot]) !== 3) continue
    const wings = peers[pivot].filter(
      (p) => !board[p] && countBits(cands[p]) === 2 && (cands[p] & cands[pivot]) === cands[p],
    )
    for (const [a, b] of combinations(wings, 2)) {
      const z = cands[a] & cands[b]
      if (countBits(z) !== 1 || (cands[a] | cands[b]) !== cands[pivot]) continue
      const targets = peers[pivot].filter(
        (c) => c !== a && c !== b && sees(n, a, c) && sees(n, b, c),
      )
      const remove = removals(cands, targets, z)
      if (!remove.length) continue
      const d = onlyDigit(z)
      const [x, y] = digitsOf(cands[pivot] & ~z)
      steps.push(
        step(
          'xyz-wing',
          3,
          { remove, sources: [pivot, a, b] },
          `The middle cell is ${orList(digitsOf(cands[pivot]))}, and the outer cells are ${orList([x, d].sort())} and ${orList([y, d].sort())}. One of the three must be ${d}, so no cell that sees all three can be ${d}.`,
        ),
      )
    }
  }
  return steps
}

//what if: a candidate that leads the singles into a dead end can't be right
//tries cells with the fewest candidates first, since those settle fastest
export const whatIf = (board, cands, n) => {
  const open = [...board.keys()]
    .filter((i) => !board[i])
    .sort((a, b) => countBits(cands[a]) - countBits(cands[b]))
  const { peers } = geometry(n)
  for (const i of open) {
    for (const d of digitsOf(cands[i])) {
      const trialBoard = board.slice()
      const trialCands = cands.slice()
      trialBoard[i] = d
      trialCands[i] = 0
      for (const p of peers[i]) trialCands[p] &= ~bit(d)
      if (settle(trialBoard, trialCands, n)) continue
      return [
        step(
          'what-if',
          3,
          { remove: [[i, bit(d)]], sources: [i] },
          `If this cell were ${d}, the singles would soon leave a cell or a ${d} with nowhere to go, so it can't be ${d}.`,
        ),
      ]
    }
  }
  return []
}

export const nakedPairs = nakedSubsets(2, 1)
export const hiddenPairs = hiddenSubsets(2, 1)
export const nakedTriples = nakedSubsets(3, 2)
export const hiddenTriples = hiddenSubsets(3, 2)
export const nakedQuads = nakedSubsets(4, 2)
export const hiddenQuads = hiddenSubsets(4, 2)
export const xWing = fish(2, 2)
export const swordfish = fish(3, 3)
export const jellyfish = fish(4, 3)

//each level's techniques, easiest first; a new technique is one entry here
const techniques = [
  [hiddenSingles, nakedSingles],
  [lockedCandidates, nakedPairs, hiddenPairs],
  [nakedTriples, hiddenTriples, xWing, xyWing, nakedQuads, hiddenQuads],
  [swordfish, xyzWing, jellyfish, whatIf],
]

//a cell left with no candidates, or a unit with a digit that has nowhere to go
const broken = (board, cands, n) => {
  for (let i = 0; i < board.length; i++) if (!board[i] && !cands[i]) return true
  for (const { cells } of geometry(n).units) {
    let mask = 0
    for (const i of cells) mask |= board[i] ? bit(board[i]) : cands[i]
    if (mask !== all(n)) return true
  }
  return false
}

//the easiest steps available using techniques up to a level, or a contradiction
export const nextSteps = (board, cands, n, top = levels.length - 1, from = 0) => {
  if (broken(board, cands, n)) return { contradiction: true, steps: [] }
  for (let level = from; level <= top; level++) {
    for (const technique of techniques[level]) {
      const steps = technique(board, cands, n)
      if (steps.length) return { level, steps }
    }
  }
  return { steps: [] }
}

//applies steps in place, false when two placements disagree
export const apply = (board, cands, n, steps) => {
  const { peers } = geometry(n)
  for (const { place, remove } of steps) {
    for (const [i, mask] of remove) cands[i] &= ~mask
    for (const [i, d] of place) {
      if (board[i] !== EMPTY) {
        if (board[i] !== d) return false
        continue
      }
      if (!(cands[i] & bit(d))) return false
      board[i] = d
      cands[i] = 0
      for (const p of peers[i]) cands[p] &= ~bit(d)
    }
  }
  return true
}

//the hardest level a board needs, or null when techniques up to top can't finish it
//finishing by sound steps also proves the solution is the only one
//the singles are exactly what the solver's settle places, so it stands in for them
export const rate = (givens, n, top = levels.length - 1) => {
  const board = givens.slice()
  const cands = candidatesOf(board, n)
  let hardest = 0
  for (;;) {
    if (!settle(board, cands, n)) return null
    if (full(board)) break
    if (top < 1) return null
    const { contradiction, level, steps } = nextSteps(board, cands, n, top, 1)
    if (contradiction || !steps.length) return null
    hardest = Math.max(hardest, level)
    if (!apply(board, cands, n, steps)) return null
  }
  return { level: hardest, solution: board }
}
