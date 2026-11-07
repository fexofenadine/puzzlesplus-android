import { h } from 'hyperapp'
import s from './SudokuCell.module.css'
import { bit } from './rules'

const hintClass = {
  source: s.hintSource,
  place: s.hintPlace,
  remove: s.hintRemove,
  wrong: s.hintWrong,
}

//notes as small digits in the box's shape, the focused digit stressed
const Notes = ({ notes, n, cols, focus }) => (
  <span class={s.notes} style={{ '--cols': cols }}>
    {Array.from({ length: n }, (_, k) => (
      <span class={notes & bit(k + 1) ? (k + 1 === focus ? s.noteFocus : s.note) : s.noteOff}>
        {k + 1}
      </span>
    ))}
  </span>
)

//a cell: its digit, its notes, or a hint's digit faintly when a hint places one here
const Cell = ({
  i,
  digit,
  given,
  notes,
  n,
  cols,
  focus,
  look,
  error,
  mark,
  ghost,
  style,
  onPress,
}) => (
  <button
    type="button"
    tabindex={-1}
    data-cell={i}
    style={style}
    class={[
      s.root,
      given ? s.given : s.entry,
      look && s[look],
      error && s.error,
      mark && hintClass[mark],
    ]
      .filter(Boolean)
      .join(' ')}
    onpointerdown={(event) => onPress({ event, i })}
  >
    {digit ? (
      String(digit)
    ) : ghost ? (
      <span class={s.ghost}>{ghost}</span>
    ) : notes ? (
      <Notes notes={notes} n={n} cols={cols} focus={focus} />
    ) : (
      ''
    )}
  </button>
)

export default Cell
