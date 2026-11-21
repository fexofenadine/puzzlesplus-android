import { h } from 'hyperapp'
import g from '../bridges/Bridges.module.css'
import Cell from '../bridges/Cell'
import { drawings } from '../bridges/Game'
import { degreesOf, linksOf } from '../bridges/rules'
import { startState } from '../bridges/solver'
import { apply, nextSteps } from '../bridges/techniques'
import { Figure, noop } from './Guide'

//rows of . for water and 1 to 8 for an island, with the bridges drawn in the water between them:
//- and = for one and two across, | and : for one and two down
export const boardOf = (rows) => {
  const n = rows.length
  const cells = [...rows.join('')]
  const islands = Int8Array.from(cells, (c) => (/\d/.test(c) ? Number(c) : 0))
  const { links } = linksOf(islands, n)
  const board = Int8Array.from(links, ({ cells: water }) => {
    const c = cells[water[0]]
    return '-|'.includes(c) ? 1 : '=:'.includes(c) ? 2 : 0
  })
  return { n, islands, board }
}

//the first step of a technique on the board, as a hint would reach it: bridges ruled out by easier
//steps go quietly, and a bridge that could be placed by another technique first means the
//example is wrong
export const exampleStep = (rows, technique) => {
  const { n, islands, board } = boardOf(rows)
  const state = startState(islands, n)
  state.lo.set(board)
  for (let round = 0; round < 200; round++) {
    const { steps } = nextSteps(islands, n, state)
    if (!steps.length) return null
    const found = steps.find((step) => step.technique === technique)
    if (found) return found
    if (steps.some((s) => s.change.some(([l, least]) => least > state.lo[l]))) return null
    if (!apply(state, steps)) return null
  }
  return null
}

//the technique the easiest step on the board uses
export const easiest = (rows) => {
  const { n, islands, board } = boardOf(rows)
  const state = startState(islands, n)
  state.lo.set(board)
  return nextSteps(islands, n, state).steps[0]?.technique
}

//what a step shows: where it looks, the bridges it places and the links it rules out
const marksOf = (step, board) => ({
  cells: step ? Object.fromEntries(step.sources.map((i) => [i, 'source'])) : {},
  links: step
    ? Object.fromEntries(
        step.change.flatMap(([l, least, most]) => {
          if (least > board[l]) return [[l, { kind: 'bridge', count: least }]]
          return most === 0 ? [[l, { kind: 'none', count: 0 }]] : []
        }),
      )
    : {},
})

//a board, and with a technique the step it finds and the hint's words for it
const BridgesExample = ({ rows, technique }) => {
  const { n, islands, board } = boardOf(rows)
  const step = technique && exampleStep(rows, technique)
  const marks = marksOf(step, board)
  const degree = degreesOf(islands, n, board)
  const { bridge, ghost, none } = drawings(islands, n, board, marks)
  return (
    <Figure caption={step && step.text}>
      <div class={g.inactive} style={{ '--n': n }}>
        {[...islands].map((island, i) => (
          <Cell
            i={i}
            island={island}
            bridge={bridge.get(i)}
            ghost={ghost.get(i)}
            none={none.has(i)}
            done={island > 0 && degree[i] === island}
            mark={marks.cells[i]}
            onPress={noop}
          />
        ))}
      </div>
    </Figure>
  )
}

export default BridgesExample
