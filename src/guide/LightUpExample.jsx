import { h } from 'hyperapp'
import g from '../lightup/LightUp.module.css'
import Cell from '../lightup/Cell'
import { BLANK, BULB, CROSS, EMPTY, WHITE, litOf } from '../lightup/rules'
import { boxed, full, lone, need, nextSteps, squeeze, starve, whatIf } from '../lightup/techniques'
import { Figure, noop } from './Guide'

const finders = { need, full, boxed, lone, squeeze, starve, 'what-if': whatIf }

//rows of . for a white cell, o for a bulb, x for a cross, # for a wall and 0 to 4 for a numbered one
export const boardOf = (rows) => {
  const cells = [...rows.join('')]
  return {
    n: rows.length,
    layout: Int8Array.from(cells, (c) => (c === '#' ? BLANK : /\d/.test(c) ? Number(c) : WHITE)),
    board: Int8Array.from(cells, (c) => (c === 'o' ? BULB : c === 'x' ? CROSS : EMPTY)),
  }
}

//the first step the technique finds on the board, as a hint would show it
export const exampleStep = (rows, technique) => {
  const { layout, board, n } = boardOf(rows)
  return finders[technique](layout, board, n)[0]
}

//the technique the easiest step on the board uses
export const easiest = (rows) => {
  const { layout, board, n } = boardOf(rows)
  return nextSteps(layout, board, n).steps[0]?.technique
}

const marksOf = (step) =>
  step
    ? Object.fromEntries([
        ...step.sources.map((i) => [i, 'source']),
        ...step.place.map(([i, value]) => [i, value === BULB ? 'bulb' : 'cross']),
      ])
    : {}

//a board, and with a technique the step it finds and the hint's words for it
const LightUpExample = ({ rows, technique }) => {
  const { layout, board, n } = boardOf(rows)
  const step = technique && exampleStep(rows, technique)
  const marks = marksOf(step)
  const lit = litOf(layout, board, n)
  return (
    <Figure caption={step && step.text}>
      <div class={g.inactive} style={{ '--n': n }}>
        {[...board].map((value, i) => (
          <Cell i={i} wall={layout[i]} value={value} lit={lit[i]} mark={marks[i]} onPress={noop} />
        ))}
      </div>
    </Figure>
  )
}

export default LightUpExample
