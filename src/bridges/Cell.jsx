import { h } from 'hyperapp'
import { cx } from '../shell/classes'
import s from './BridgesCell.module.css'

const hintClass = {
  source: s.hintSource,
  wrong: s.hintWrong,
}

//the lines a bridge draws across a cell, by direction and count
const lines = {
  across: [null, s.acrossOne, s.acrossTwo],
  down: [null, s.downOne, s.downTwo],
}

//an island: its number in a disc, dimmed once it has all its bridges
//water: a bridge across it, if any, a hint's faint bridge or its cross for a link that holds none
const Cell = ({ i, island, bridge, ghost, none, done, error, mark, selected, cursor, onPress }) => {
  if (island) {
    return (
      <div
        data-cell={i}
        class={cx(
          s.island,
          done && s.done,
          error && s.islandError,
          selected && s.selected,
          cursor && s.cursor,
          mark && hintClass[mark],
        )}
        onpointerdown={(event) => onPress({ event, i })}
      >
        {island}
      </div>
    )
  }
  //a hint's bridge shows over one already built when it holds more
  const hinted = ghost && (!bridge || ghost.count > bridge.count)
  const drawn = hinted ? ghost : bridge
  return (
    <div
      data-cell={i}
      class={cx(
        s.water,
        drawn && lines[drawn.across ? 'across' : 'down'][drawn.count],
        hinted && s.ghost,
        hinted && ghost.wrong && s.wrongBridge,
        none && s.none,
        cursor && s.cursor,
      )}
      onpointerdown={(event) => onPress({ event, i })}
    />
  )
}

export default Cell
