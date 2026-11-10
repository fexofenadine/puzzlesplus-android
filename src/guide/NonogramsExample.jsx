import { h } from 'hyperapp'
import { cx } from '../shell/classes'
import s from '../nonograms/Game.module.css'
import Cell from '../nonograms/Cell'
import { place, tracks } from '../nonograms/Game'
import { CROSS, EMPTY, FILL, cluesOf, lineDone, cellsOf } from '../nonograms/rules'
import { lineSteps, nextSteps } from '../nonograms/techniques'
import { Figure } from './Guide'

const levelOf = {
  complete: 0,
  overlap: 0,
  gap: 0,
  forcing: 1,
  reach: 1,
  line: 2,
}

//# filled, x crossed out, . empty
const valueOf = (c) => (c === '#' ? FILL : c === 'x' ? CROSS : EMPTY)
export const lineOf = (text) => Int8Array.from(text, valueOf)
export const boardOf = (rows) => Int8Array.from(rows.join(''), valueOf)

//one row's step with the technique, worded as a hint would word it
export const lineStep = (clue, text, technique) => {
  const found = lineSteps(lineOf(text), clue, levelOf[technique]).find(
    (step) => step.technique === technique,
  )
  return found && { ...found, text: found.text('this row', ['left', 'right']) }
}

//a whole board's first step with the technique
export const boardStep = (clues, rows, technique) =>
  nextSteps(boardOf(rows), rows.length, clues).steps.find((step) => step.technique === technique)

const marksOf = (step) =>
  step
    ? Object.fromEntries([
        ...step.sources.map((i) => [i, 'source']),
        ...step.place.map(([i, v]) => [i, v === FILL ? 'fill' : 'cross']),
      ])
    : {}

const noop = () => null

const Clue = ({ clue, done, hinted, style }) => (
  <div class={cx(s.clue, done && s.done, hinted && s.hinted)} style={style}>
    {(clue.length ? clue : [0]).map((run) => (
      <span class={run > 9 && s.wide}>{run}</span>
    ))}
  </div>
)

//a single row and its clue, with the step a technique finds in it
export const LineExample = ({ clue, values, technique }) => {
  const step = technique && lineStep(clue, values, technique)
  const marks = marksOf(step)
  const one = { gridTemplateRows: 'var(--size)' }
  return (
    <Figure caption={step && step.text}>
      <div class={s.board} style={{ '--tracks': tracks(values.length) }}>
        <div class={s.rows} style={one}>
          <Clue clue={clue} hinted={Boolean(step)} />
        </div>
        <div class={s.inactive} style={one}>
          {[...lineOf(values)].map((value, k) => (
            <Cell
              i={k}
              value={value}
              mark={marks[k]}
              style={{ gridColumn: place(k), gridRow: 1 }}
              onPress={noop}
            />
          ))}
        </div>
      </div>
    </Figure>
  )
}

//a whole board, from a picture of # cells when no clues are given
export const BoardExample = ({ rows, clues, technique }) => {
  const n = rows.length
  const board = boardOf(rows)
  const allClues =
    clues ||
    cluesOf(
      board.map((v) => (v === FILL ? 1 : 0)),
      n,
    )
  const step = technique && boardStep(allClues, rows, technique)
  const marks = marksOf(step)
  const lines = cellsOf(n)
  const clue = (line) => (
    <Clue
      clue={allClues[line]}
      done={lineDone(board, lines[line], allClues[line])}
      hinted={step && step.line === line}
      style={line < n ? { gridRow: place(line) } : { gridColumn: place(line - n) }}
    />
  )
  return (
    <Figure caption={step && step.text}>
      <div class={s.board} style={{ '--tracks': tracks(n) }}>
        <div class={s.columns}>{lines.slice(n).map((_, x) => clue(n + x))}</div>
        <div class={s.rows}>{lines.slice(0, n).map((_, y) => clue(y))}</div>
        <div class={s.inactive}>
          {[...board].map((value, i) => (
            <Cell
              i={i}
              value={value}
              mark={marks[i]}
              style={{ gridColumn: place(i % n), gridRow: place(Math.floor(i / n)) }}
              onPress={noop}
            />
          ))}
        </div>
      </div>
    </Figure>
  )
}
