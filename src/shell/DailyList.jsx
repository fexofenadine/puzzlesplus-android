import { h } from 'hyperapp'
import s from './StatsList.module.css'
import Button from '../Button'

const days = (count) => `${count} ${count === 1 ? 'day' : 'days'}`

//the daily puzzle's rows in a best times dialog, and a solved day to pass on
const DailyList = ({ daily, copied, onCopy }) => {
  const rows = [
    ['Today', daily.done ? (daily.time ? `${daily.time} s` : 'Solved') : 'Not yet'],
    ['Fastest', daily.fastest ? `${daily.fastest} s` : '–'],
    ['Streak', days(daily.streak)],
    ['Best streak', days(daily.best)],
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
      <p class={s.note}>
        Daily Puzzle: one board a day, the same for everyone. Times count without hints.
      </p>
      {daily.done && onCopy && (
        <p class={s.share}>
          <Button type="button" onClick={onCopy}>
            <span class={s.button}>Copy Result</span>
          </Button>
          <span class={s.copied} role="status">
            {copied === true
              ? 'Copied to the clipboard.'
              : copied === false
                ? 'Could not copy.'
                : ''}
          </span>
        </p>
      )}
    </div>
  )
}

export default DailyList
