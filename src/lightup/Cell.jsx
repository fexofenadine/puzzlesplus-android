import { h } from 'hyperapp'
import { cx } from '../shell/classes'
import s from './LightUpCell.module.css'
import { BLANK, BULB, CROSS, WHITE } from './rules'

const hintClass = {
  source: s.hintSource,
  bulb: s.hintPlace,
  cross: s.hintPlace,
  wrong: s.hintWrong,
}

//a wall, numbered or not, or a white cell: dark or lit, with a bulb, a cross or a hint's faint one
//number is what a numbered wall shows, its clue or the bulbs it still needs
const Cell = ({ i, wall, number = wall, value, lit, error, mark, cursor, onPress }) => {
  if (wall !== WHITE) {
    return (
      <div
        class={cx(
          s.wall,
          wall !== BLANK && number === 0 && wall !== 0 && s.wallDone,
          (error || number < 0) && s.wallError,
          mark && hintClass[mark],
        )}
      >
        {wall === BLANK ? '' : number}
      </div>
    )
  }
  const bulb = value === BULB || (mark === 'bulb' && value !== CROSS)
  const cross = value === CROSS || (mark === 'cross' && value !== BULB)
  return (
    <button
      type="button"
      tabindex={-1}
      class={cx(
        lit ? s.lit : s.dark,
        error && s.error,
        mark && value !== BULB && value !== CROSS && s.ghost,
        mark && hintClass[mark],
        cursor && s.cursor,
      )}
      onpointerdown={(event) => onPress({ event, i })}
    >
      {bulb && <i class={s.bulb} />}
      {cross && !bulb && <i class={s.cross} />}
    </button>
  )
}

export default Cell
