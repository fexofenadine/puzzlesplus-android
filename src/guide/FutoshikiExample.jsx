import { h } from 'hyperapp'
import g from '../futoshiki/Futoshiki.module.css'
import Cell from '../sudoku/Cell'
import { Signs, noteColumns, place, tracks } from '../futoshiki/Game'
import { EMPTY, LESS, MORE, NONE, candidatesOf } from '../futoshiki/rules'
import { apply, nextSteps } from '../futoshiki/techniques'
import { Figure, noop } from './Guide'

//an example is { rows, right, down }: rows of digits and . for empty, right of < > and spaces
//for the signs after each cell, down of ^ v and spaces for the signs under each cell
export const puzzleOf = ({ rows, right, down }) => {
  const n = rows.length
  const signs = (lines, less, more) =>
    Int8Array.from(lines.join(''), (c) => (c === less ? LESS : c === more ? MORE : NONE))
  return {
    n,
    givens: Int8Array.from(rows.join(''), (c) => (c === '.' ? EMPTY : Number(c))),
    right: signs(right, '<', '>'),
    down: signs(down, '^', 'v'),
  }
}

//the first step of a technique on the board, as a hint would reach it: candidates taken away
//by easier steps go quietly, and a digit that could be placed first means the example is wrong
export const exampleStep = (example, technique) => {
  const puzzle = puzzleOf(example)
  const board = puzzle.givens.slice()
  const cands = candidatesOf(board, puzzle.n)
  for (let round = 0; round < 200; round++) {
    const { steps } = nextSteps(puzzle, board, cands)
    if (!steps.length) return null
    const found = steps.find((step) => step.technique === technique)
    if (found) return { step: found, cands }
    if (steps.some((step) => step.place.length)) return null
    if (!apply(puzzle, board, cands, steps)) return null
  }
  return null
}

//a board, and with a technique the step it finds and the hint's words for it; the candidates
//the step works on show as notes
const FutoshikiExample = ({ example, technique }) => {
  const puzzle = puzzleOf(example)
  const { n, givens } = puzzle
  const found = technique && exampleStep(example, technique)
  const step = found && found.step
  const marks = step
    ? Object.fromEntries([
        ...step.sources.map((i) => [i, 'source']),
        ...step.remove.map(([i]) => [i, 'remove']),
        ...step.place.map(([i]) => [i, 'place']),
      ])
    : {}
  const ghosts = step ? Object.fromEntries(step.place) : {}
  return (
    <Figure caption={step && step.text}>
      <div class={g.inactive} style={{ '--tracks': tracks(n), '--size': '32px', '--gap': '15px' }}>
        {[...givens].map((digit, i) => (
          <Cell
            i={i}
            digit={digit}
            given={digit !== EMPTY}
            notes={found && marks[i] && !ghosts[i] ? found.cands[i] : 0}
            n={n}
            cols={noteColumns(n)}
            focus={0}
            mark={marks[i]}
            ghost={ghosts[i]}
            style={{ gridColumn: place(i % n), gridRow: place(Math.floor(i / n)) }}
            onPress={noop}
          />
        ))}
        <Signs n={n} right={puzzle.right} down={puzzle.down} />
      </div>
    </Figure>
  )
}

export default FutoshikiExample
