import { h } from 'hyperapp'
import g from '../sudoku/Sudoku.module.css'
import Cell from '../sudoku/Cell'
import { place, tracks } from '../sudoku/Game'
import { EMPTY, bit, candidatesOf, geometry, onlyDigit } from '../sudoku/rules'
import {
  hiddenPairs,
  hiddenSingles,
  hiddenTriples,
  lockedCandidates,
  nakedPairs,
  nakedSingles,
  nakedTriples,
  nextSteps,
  swordfish,
  whatIf,
  xWing,
  xyWing,
  xyzWing,
} from '../sudoku/techniques'
import { Figure } from './Guide'

const finders = {
  'hidden-single': hiddenSingles,
  'naked-single': nakedSingles,
  pointing: lockedCandidates,
  claiming: lockedCandidates,
  'naked-pair': nakedPairs,
  'hidden-pair': hiddenPairs,
  'naked-triple': nakedTriples,
  'hidden-triple': hiddenTriples,
  'x-wing': xWing,
  'xy-wing': xyWing,
  swordfish,
  'xyz-wing': xyzWing,
  'what-if': whatIf,
}

//rows of digits and dots, and the candidates earlier steps had already taken away
export const positionOf = ({ rows, removed = [] }) => {
  const n = rows.length
  const board = Int8Array.from(rows.join(''), (c) => (c === '.' ? EMPTY : Number(c)))
  const cands = candidatesOf(board, n)
  for (const [i, digits] of removed) for (const d of digits) cands[i] &= ~bit(Number(d))
  return { board, cands, n }
}

//the first step the technique finds in the position, as a hint would show it
export const exampleStep = (example, technique) => {
  const { board, cands, n } = positionOf(example)
  return finders[technique](board, cands, n).find((step) => step.technique === technique)
}

//the technique the position's easiest step uses, which the example should be about
export const easiest = (example) => {
  const { board, cands, n } = positionOf(example)
  return nextSteps(board, cands, n).steps[0]?.technique
}

const marksOf = (step) =>
  step
    ? Object.fromEntries([
        ...step.remove.map(([i]) => [i, 'remove']),
        ...step.sources.map((i) => [i, 'source']),
        ...step.place.map(([i]) => [i, 'place']),
      ])
    : {}

const noop = () => null

//the one digit a step takes away, stressed in the notes, or 0 when it takes several
const focusOf = (step) => {
  const masks = step ? step.remove.map(([, mask]) => mask) : []
  const [first] = masks
  return first && !(first & (first - 1)) && masks.every((m) => m === first) ? onlyDigit(first) : 0
}

//a board, and with a technique the step it finds and the hint's words for it
//candidates show as notes once a technique works on them rather than on placed digits
const SudokuExample = (example) => {
  const { technique } = example
  const { board, cands, n } = positionOf(example)
  const { bw, bh } = geometry(n)
  const step = technique && exampleStep(example, technique)
  const marks = marksOf(step)
  const ghosts = step ? Object.fromEntries(step.place) : {}
  const notes = step && step.level > 0
  return (
    <Figure caption={step && step.text}>
      <div class={g.board}>
        <div class={g.inactive} style={{ '--tracks': tracks(n, bw), '--rows': tracks(n, bh) }}>
          {[...board].map((digit, i) => (
            <Cell
              i={i}
              digit={digit}
              given={true}
              notes={notes && !digit ? cands[i] : 0}
              n={n}
              cols={bw}
              focus={focusOf(step)}
              mark={marks[i]}
              ghost={ghosts[i]}
              style={{ gridColumn: place(i % n), gridRow: place(Math.floor(i / n)) }}
              onPress={noop}
            />
          ))}
        </div>
      </div>
    </Figure>
  )
}

export default SudokuExample
