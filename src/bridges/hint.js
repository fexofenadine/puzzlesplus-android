import { breaks, linksOf, solved } from './rules'
import { startState } from './solver'
import { apply, nextSteps } from './techniques'

//asked when every island has its bridges but the board is not solved
export const completeWithErrors =
  'Every island has its bridges but the puzzle is not solved. Do you want to use a hint?'

//the guide section a hint is about, techniques have their own, mistakes share one
export const guideTopic = ({ kind }) =>
  ({ break: 'mistakes', wrong: 'mistakes', reveal: 'mistakes', solved: null })[kind] ?? kind

//the islands a step looks at: its sources and the ends of the links it changes
const scopeOf = (step, links) =>
  new Set([...step.sources, ...step.change.flatMap(([l]) => [links[l].a, links[l].b])])

//the next thing to do: a broken rule first, then a link with more bridges than the solution has,
//then the easiest step that places a bridge; steps that only rule bridges out go on quietly and
//the ones in the bridge step's reach come with it
//returns { kind, text, marks, place? }, marks has cells (source, wrong) and links
//({ kind: bridge, none or wrong, count })
export const findHint = ({ islands, board, solution, n }) => {
  const { links } = linksOf(islands, n)
  if (solved(islands, n, board)) {
    return { kind: 'solved', text: 'The puzzle is solved.', marks: { cells: {}, links: {} } }
  }
  const broken = breaks(islands, n, board)
  if (broken.length) {
    const { cells, links: across = [], text } = broken[0]
    return {
      kind: 'break',
      text: `${text} The islands outlined in red are the ones to look at.`,
      marks: {
        cells: Object.fromEntries(cells.map((i) => [i, 'wrong'])),
        links: Object.fromEntries(across.map((l) => [l, { kind: 'wrong', count: board[l] }])),
      },
    }
  }
  const wrong = links.findIndex((_, l) => board[l] > solution[l])
  if (wrong >= 0) {
    return {
      kind: 'wrong',
      text: "This link has more bridges than the puzzle's only solution gives it. Take one away and the reasoning can carry on.",
      marks: { cells: {}, links: { [wrong]: { kind: 'wrong', count: board[wrong] } } },
    }
  }
  const work = startState(islands, n)
  work.lo.set(board)
  const quiet = []
  for (;;) {
    const { steps } = nextSteps(islands, n, work)
    if (!steps.length) break
    const raised = (s) => s.change.some(([l, least]) => least > work.lo[l])
    const bridge = steps.find(raised)
    if (!bridge) {
      //only ruling bridges out: it goes on quietly until a bridge follows from it
      if (!apply(work, steps)) break
      quiet.push(...steps)
      continue
    }
    const scope = scopeOf(bridge, links)
    const leaned = quiet.filter((s) => [...scopeOf(s, links)].some((i) => scope.has(i)))
    const first = leaned[0]
    const more = leaned.length > 1 ? ' The other links shown are ruled out in the same way.' : ''
    const place = bridge.change.filter(([l, least]) => least > work.lo[l]).map(([l, c]) => [l, c])
    return {
      kind: bridge.technique,
      text: first ? `${first.text}${more} ${bridge.text}` : bridge.text,
      place,
      marks: {
        cells: Object.fromEntries(
          [...leaned.flatMap((s) => s.sources), ...bridge.sources].map((i) => [i, 'source']),
        ),
        links: Object.fromEntries([
          ...leaned.flatMap((s) => s.change).map(([l]) => [l, { kind: 'none', count: 0 }]),
          ...place.map(([l, count]) => [l, { kind: 'bridge', count }]),
        ]),
      },
    }
  }
  //dealt boards never get here, but a hint should never come back empty
  const l = links.findIndex((_, c) => solution[c] > board[c])
  return {
    kind: 'reveal',
    text: 'No rule gives the next bridge away, so this one comes from the solution.',
    place: [[l, board[l] + 1]],
    marks: { cells: {}, links: { [l]: { kind: 'bridge', count: board[l] + 1 } } },
  }
}
