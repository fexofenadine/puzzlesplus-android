import { BULB, CROSS, EMPTY, WHITE, besideOf, breaks, sightsOf, solved } from './rules'
import { apply, nextSteps } from './techniques'

//asked when every cell is lit but the board is not solved
export const completeWithErrors =
  'Every cell is lit but there are errors. Do you want to use a hint?'

//the guide section a hint is about, techniques have their own, mistakes share one
export const guideTopic = ({ kind }) =>
  ({ break: 'mistakes', wrong: 'mistakes', reveal: 'mistakes', solved: null })[kind] ?? kind

//a mark that can't stand: a bulb where the solution has none, or a cross on one of its bulbs
const wrongAt = (board, solution, i) =>
  (board[i] === BULB && !solution[i]) || (board[i] === CROSS && solution[i] === 1)

const markOf = (value) => (value === BULB ? 'bulb' : 'cross')

//the cells a step looks at: in line with or beside what it names
const scopeOf = (step, layout, n) => {
  const sights = sightsOf(layout, n)
  const beside = besideOf(n)
  const anchors = [...step.sources, ...step.place.map(([i]) => i)]
  return new Set(anchors.flatMap((a) => [...sights[a], ...beside[a]]))
}

//the next thing to do: a broken rule first, then a mark that can't be right, then the easiest
//step that places a bulb; crosses that step leans on and the board lacks come with it
//returns { kind, text, marks, place? }, marks maps a cell to source, bulb, cross or wrong
export const findHint = ({ layout, board, solution, n }) => {
  if (solved(layout, board, n)) return { kind: 'solved', text: 'The puzzle is solved.', marks: {} }
  const broken = breaks(layout, board, n)
  if (broken.length) {
    //not every cell of a broken rule is wrong, the solution picks out the ones to change
    const { cells, text } = broken[0]
    const bad = cells.filter((i) => layout[i] === WHITE && wrongAt(board, solution, i))
    const fix = bad.length ? bad : cells.filter((i) => layout[i] === WHITE)
    return {
      kind: 'break',
      text: `${text} ${fix.length > 1 ? 'The cells outlined in red are the ones' : 'The cell outlined in red is the one'} to change.`,
      marks: Object.fromEntries(cells.map((i) => [i, fix.includes(i) ? 'wrong' : 'source'])),
    }
  }
  const wrong = [...board.keys()].find((i) => layout[i] === WHITE && wrongAt(board, solution, i))
  if (wrong !== undefined) {
    return {
      kind: 'wrong',
      text:
        board[wrong] === BULB
          ? "This bulb doesn't fit the puzzle's only solution. Take it away and the reasoning can carry on."
          : 'A bulb belongs where this cross is. Clear it and the reasoning can carry on.',
      marks: { [wrong]: 'wrong' },
    }
  }
  const work = board.slice()
  const crossed = []
  for (;;) {
    const { steps } = nextSteps(layout, work, n)
    if (!steps.length) break
    const bulb = steps.find((s) => s.place.some(([, value]) => value === BULB))
    if (!bulb) {
      //crosses only: they go on quietly until a bulb follows from them
      if (!apply(work, steps)) break
      crossed.push(...steps)
      continue
    }
    const scope = scopeOf(bulb, layout, n)
    const leaned = crossed.filter((s) => s.place.some(([i]) => scope.has(i)))
    const first = leaned[0]
    const more = leaned.length > 1 ? ' The other crosses shown are ruled out in the same way.' : ''
    return {
      kind: bulb.technique,
      text: first ? `${first.text}${more} ${bulb.text}` : bulb.text,
      place: [...leaned.flatMap((s) => s.place), ...bulb.place],
      marks: Object.fromEntries([
        ...leaned.flatMap((s) => s.sources).map((i) => [i, 'source']),
        ...bulb.sources.map((i) => [i, 'source']),
        ...leaned.flatMap((s) => s.place).map(([i, value]) => [i, markOf(value)]),
        ...bulb.place.map(([i, value]) => [i, markOf(value)]),
      ]),
    }
  }
  //dealt boards never get here, but a hint should never come back empty
  const i = [...board.keys()].find((c) => solution[c] === 1 && board[c] === EMPTY)
  return {
    kind: 'reveal',
    text: 'No rule gives the next bulb away, so this one comes from the solution.',
    place: [[i, BULB]],
    marks: { [i]: 'bulb' },
  }
}
