import { h } from 'hyperapp'
import { SubMenuItem } from '../Menu'
import { phone } from './phone'

export const games = [
  ['minesweeper', 'Minesweeper'],
  ['takuzu', 'Takuzu'],
  ['nonograms', 'Nonograms'],
]

//every game's page for the game menu, the open one checked
//a phone lists them at the top of its drawer instead
export const gameLinks = (current) =>
  !phone &&
  games.map(([id, name]) => (
    <SubMenuItem
      name={name}
      checked={id === current}
      onClick={() => id !== current && location.assign(`../${id}/`)}
    />
  ))
