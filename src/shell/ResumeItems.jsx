import { h } from 'hyperapp'
import { Separator, SubMenuItem } from '../Menu'

export const clockText = (ms) => {
  const total = Math.floor(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

//a game menu's parked games, nothing while the shelf is empty
export const resumeItems = ({ shelf }, actions) =>
  shelf.length
    ? [
        ...shelf.map(({ id, label, elapsed }) => (
          <SubMenuItem
            name={`Resume ${label} ${clockText(elapsed)}`}
            onClick={() => actions.resumeGame(id)}
          />
        )),
        <Separator />,
      ]
    : null
