import { h } from 'hyperapp'
import g from '../Game.module.css'
import Cell from '../Cell'
import { neighboursOf } from '../mines'
import { explainChord, findHint } from '../hint'
import { Figure, noop } from './Guide'

//rows of * hidden mine, . hidden safe, F flagged mine, f wrong flag, o opened
//numbers come from the mines, so the board always adds up
const fieldOf = (rows) => {
  const width = rows[0].length
  const height = rows.length
  const cells = rows.join('')
  const around = neighboursOf(width, height)
  const mined = (c) => c === '*' || c === 'F'
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const i = y * width + x
      return {
        opened: cells[i] === 'o',
        mined: mined(cells[i]),
        flag: cells[i] === 'F' || cells[i] === 'f',
        mark: false,
        num: around[i].filter((n) => mined(cells[n])).length,
      }
    }),
  )
}

//what the hint says about the board, or about a chord on chord = [x, y]
export const exampleHint = ({ rows, mines, chord }) => {
  const field = fieldOf(rows)
  const width = rows[0].length
  const height = rows.length
  if (chord) return explainChord({ field, width, height }, chord[0], chord[1])
  const flags = field.flat().filter((c) => c.flag).length
  return findHint({ field, width, height, minesLeft: mines - flags })
}

//a board and the hint for it, the counter shown when it matters
const MinesExample = ({ rows, mines, chord }) => {
  const field = fieldOf(rows)
  const hint = exampleHint({ rows, mines, chord })
  const width = rows[0].length
  return (
    <Figure caption={hint && hint.text}>
      <div class={g.field}>
        {field.map((row, y) => (
          <div class={g.inactive}>
            {row.map((cell, x) => (
              <Cell
                x={x}
                y={y}
                pressed={false}
                pressedX={-1}
                pressedY={-1}
                group={false}
                opened={cell.opened}
                mined={cell.mined}
                flag={cell.flag}
                mark={false}
                num={cell.num}
                hint={hint && hint.marks[y * width + x]}
                lose={false}
                onDown={noop}
                onMove={noop}
                onTouch={noop}
                onChord={noop}
              />
            ))}
          </div>
        ))}
      </div>
    </Figure>
  )
}

export default MinesExample
