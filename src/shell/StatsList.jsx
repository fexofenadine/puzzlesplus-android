import { h } from 'hyperapp'
import s from './StatsList.module.css'
import { average, clockText } from './stats'

//games finished, with the rate for games that can be lost, and streaks without help
const StatsList = ({ stats, losses = false, wonLabel = 'Won' }) => {
  const played = stats.won + stats.lost
  const rows = [
    [wonLabel, stats.won],
    ...(losses
      ? [
          ['Lost', stats.lost],
          ['Win rate', played ? `${Math.round((100 * stats.won) / played)}%` : '–'],
        ]
      : []),
    ['Without help', stats.clean],
    ...(stats.timed ? [['Average time', clockText(average(stats.total, stats.timed))]] : []),
    ['Streak', stats.streak],
    ['Best streak', stats.best],
  ]
  //boards won timed and without help, the most played first
  const boards = Object.entries(stats.levels || {}).sort((a, b) => b[1][0] - a[1][0])
  return (
    <div class={s.root}>
      <dl class={s.list}>
        {rows.map(([name, value]) => (
          <div class={s.row}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {boards.length > 0 && (
        <div class={s.boards} title="Wins without hints or undo, timed">
          {boards.map(([name, [wins, seconds]]) => (
            <div class={s.board}>
              <span>{name}</span>
              <span>{wins} won</span>
              <span>{clockText(average(seconds, wins))}</span>
            </div>
          ))}
        </div>
      )}
      <p class={s.note}>Streaks and averages count wins without hints or undo.</p>
    </div>
  )
}

export default StatsList
