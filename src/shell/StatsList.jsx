import { h } from 'hyperapp'
import s from './StatsList.module.css'

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
    ['Streak', stats.streak],
    ['Best streak', stats.best],
  ]
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
      <p class={s.note}>Streaks count wins without hints or undo.</p>
    </div>
  )
}

export default StatsList
