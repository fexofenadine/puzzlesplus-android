import { EMPTY, bit, breaks, candidatesOf, geometry, solved } from './rules'
import { apply, nextSteps } from './techniques'

//asked when every cell is filled but the board is not solved
export const completeWithErrors =
  'The board is complete but there are errors. Do you want to use a hint?'

//the guide section a hint is about, techniques have their own, mistakes share one
export const guideTopic = ({ kind }) =>
  ({ break: 'mistakes', wrong: 'mistakes', reveal: 'mistakes', solved: null })[kind] ?? kind

const lower = (text) => text[0].toLowerCase() + text.slice(1)

//the removal a placement leaned on: the latest one that took a candidate from the placed cell,
//or took the placed digit from a cell in line with it
const enabler = (removals, [i, d], n) => {
  const { peers } = geometry(n)
  const near = new Set([i, ...peers[i]])
  return removals.findLast((step) =>
    step.remove.some(([c, mask]) => c === i || (near.has(c) && mask & bit(d))),
  )
}

//the next thing to do: a broken rule first, then a digit that can't be right, then the next
//placement; candidates a placement needs taken away first are taken quietly, and the removal
//that opened it is explained with it
//returns { kind, text, marks, place? }, marks maps a cell to source, place, remove or wrong
export const findHint = ({ board, solution, puzzle }) => {
  const { n } = puzzle
  if (solved(board, puzzle)) return { kind: 'solved', text: 'The puzzle is solved.', marks: {} }
  const broken = breaks(board, puzzle)
  if (broken.length) {
    //not every cell of a broken rule is wrong, the solution picks out the ones to change
    const { cells, text } = broken[0]
    const bad = cells.filter((i) => board[i] !== solution[i])
    const fix = bad.length ? bad : cells.filter((i) => puzzle.givens[i] === EMPTY)
    return {
      kind: 'break',
      text: `${text} ${fix.length > 1 ? 'The cells outlined in red are the ones' : 'The cell outlined in red is the one'} to change.`,
      marks: Object.fromEntries(cells.map((i) => [i, fix.includes(i) ? 'wrong' : 'source'])),
    }
  }
  const wrong = [...board.keys()].find((i) => board[i] !== EMPTY && board[i] !== solution[i])
  if (wrong !== undefined) {
    return {
      kind: 'wrong',
      text: `This ${board[wrong]} doesn't fit the puzzle's only solution. Clear it and the reasoning can carry on.`,
      marks: { [wrong]: 'wrong' },
    }
  }
  const work = board.slice()
  const cands = candidatesOf(work, n)
  const removals = []
  for (let round = 0; round < 500; round++) {
    const { contradiction, steps } = nextSteps(puzzle, work, cands)
    if (contradiction || !steps.length) break
    const placement = steps.find((step) => step.place.length)
    if (!placement) {
      if (!apply(puzzle, work, cands, steps)) break
      removals.push(...steps)
      continue
    }
    const before = enabler(removals, placement.place[0], n)
    return {
      kind: before ? before.technique : placement.technique,
      text: before ? `${before.text} Then ${lower(placement.text)}` : placement.text,
      place: placement.place,
      marks: Object.fromEntries([
        ...(before ? before.sources : []).map((i) => [i, 'source']),
        ...(before ? before.remove : []).map(([i]) => [i, 'remove']),
        ...placement.sources.map((i) => [i, 'source']),
        ...placement.place.map(([i]) => [i, 'place']),
      ]),
    }
  }
  //dealt boards never get here, but a hint should never come back empty
  const i = board.indexOf(EMPTY)
  return {
    kind: 'reveal',
    text: 'No rule gives the next digit away, so this one comes from the solution.',
    place: [[i, solution[i]]],
    marks: { [i]: 'place' },
  }
}
