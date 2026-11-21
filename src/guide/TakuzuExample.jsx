import { h } from 'hyperapp'
import g from '../takuzu/Game.module.css'
import Cell from '../takuzu/Cell'
import { EMPTY } from '../takuzu/rules'
import { balance, counts, gaps, oneLeft, pairs, repeats, twins, whatIf } from '../takuzu/techniques'
import { Figure, noop } from './Guide'

const finders = {
  pair: pairs,
  gap: gaps,
  count: counts,
  'one-left': oneLeft,
  twins,
  balance,
  repeat: repeats,
  'what-if': whatIf,
}

//rows of 0, 1 and . for empty
export const boardOf = (rows) =>
  Int8Array.from(rows.join(''), (c) => (c === '.' ? EMPTY : Number(c)))

//the first step the technique finds on the board, as a hint would show it
export const exampleStep = (rows, technique) =>
  finders[technique](boardOf(rows), rows.length).find((step) => step.technique === technique)

const marksOf = (step) =>
  step
    ? Object.fromEntries([
        ...step.sources.map((i) => [i, 'source']),
        ...step.place.map(([i, v]) => [i, v ? 'one' : 'zero']),
      ])
    : {}

//a board, and with a technique the step it finds and the hint's words for it
const TakuzuExample = ({ rows, technique }) => {
  const board = boardOf(rows)
  const step = technique && exampleStep(rows, technique)
  const marks = marksOf(step)
  return (
    <Figure caption={step && step.text}>
      <div class={g.inactive} style={{ '--n': rows.length }}>
        {[...board].map((value, i) => (
          <Cell i={i} value={value} given={false} mark={marks[i]} onPress={noop} />
        ))}
      </div>
    </Figure>
  )
}

export default TakuzuExample
