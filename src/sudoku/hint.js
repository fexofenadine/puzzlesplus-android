import { EMPTY, bit, breaks, candidatesOf, geometry, solved } from './rules'
import { apply, nextSteps } from './techniques'

//asked when every cell is filled but the board is not solved
export const completeWithErrors =
  'The board is complete but there are errors. Do you want to use a hint?'

const marked = (entries) => Object.fromEntries(entries)

//the guide section a hint is about, techniques have their own, mistakes share one
//quads share their triples' section and jellyfish the swordfish's
export const guideTopic = ({ kind }) =>
  ({
    break: 'mistakes',
    wrong: 'mistakes',
    note: 'mistakes',
    reveal: 'mistakes',
    solved: null,
    'naked-quad': 'naked-triple',
    'hidden-quad': 'hidden-triple',
    jellyfish: 'swordfish',
  })[kind] ?? kind

//the earlier step that took away what made a placement possible: a candidate of its cell, or
//its digit from the unit it is alone in
const enabler = (rounds, placement, n) => {
  const [[i, d]] = placement.place
  const units = geometry(n).unitsOf[i]
  const matters = ([c, mask]) =>
    c === i || (mask & bit(d) && units.some((unit) => unit.cells.includes(c)))
  for (let r = rounds.length - 1; r >= 0; r--) {
    const found = rounds[r].find((s) => s.remove.some(matters))
    if (found) return found
  }
  return rounds.at(-1)[0]
}

const lower = (text) => text[0].toLowerCase() + text.slice(1)

//the next digit logic gives, with the reasoning
//removals that come first are made silently and the one that opened the digit is explained
const nextDigit = (board, n) => {
  const work = board.slice()
  const cands = candidatesOf(work, n)
  const rounds = []
  for (let k = 0; k < 200; k++) {
    const { steps } = nextSteps(work, cands, n)
    if (!steps.length) return null
    const placement = steps.find((s) => s.place.length)
    if (placement) {
      if (!rounds.length) return { placement }
      return { placement, via: enabler(rounds, placement, n) }
    }
    rounds.push(steps)
    if (!apply(work, cands, n, steps)) return null
  }
  return null
}

//the next thing to do: a broken rule, a wrong digit, notes missing the answer, then the easiest step
//returns { kind, text, marks, place? }
export const findHint = ({ board, notes, solution, n }) => {
  if (solved(board, n)) return { kind: 'solved', text: 'The puzzle is solved.', marks: {} }
  const broken = breaks(board, n)
  if (broken.length) {
    //a repeated digit's cells are not all wrong, so the solution picks out the ones to change
    const { cells, text } = broken[0]
    const bad = cells.filter((i) => board[i] !== solution[i])
    const fix = bad.length ? bad : cells
    return {
      kind: 'break',
      text: `${text} ${fix.length > 1 ? 'The cells outlined in red are the ones' : 'The cell outlined in red is the one'} to change.`,
      marks: marked(cells.map((i) => [i, fix.includes(i) ? 'wrong' : 'source'])),
    }
  }
  const wrong = [...board.keys()].find((i) => board[i] !== EMPTY && board[i] !== solution[i])
  if (wrong !== undefined) {
    return {
      kind: 'wrong',
      text: `This ${board[wrong]} breaks no rule yet but doesn't fit the puzzle's only solution. Clear it and the reasoning can carry on.`,
      marks: { [wrong]: 'wrong' },
    }
  }
  const missing = [...board.keys()].find(
    (i) => board[i] === EMPTY && notes && notes[i] && !(notes[i] & bit(solution[i])),
  )
  if (missing !== undefined) {
    return {
      kind: 'note',
      text: "This cell's notes leave out the digit it needs. Check them again, or use Auto Notes.",
      marks: { [missing]: 'wrong' },
    }
  }
  const found = nextDigit(board, n)
  if (!found) {
    //generated boards never get here, but a hint should never come back empty
    const i = board.indexOf(EMPTY)
    return {
      kind: 'reveal',
      text: 'No technique gives the next digit away, so this one comes from the solution.',
      place: [[i, solution[i]]],
      marks: { [i]: 'place' },
    }
  }
  const { placement, via } = found
  const [[i]] = placement.place
  if (!via) {
    return {
      kind: placement.technique,
      text: placement.text,
      place: placement.place,
      marks: marked([...placement.sources.map((c) => [c, 'source']), [i, 'place']]),
    }
  }
  return {
    kind: via.technique,
    text: `${via.text} Then ${lower(placement.text)}`,
    place: placement.place,
    marks: marked([
      ...via.remove.map(([c]) => [c, 'remove']),
      ...via.sources.map((c) => [c, 'source']),
      [i, 'place'],
    ]),
  }
}
