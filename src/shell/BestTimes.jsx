import { h } from 'hyperapp'
import b from '../BestTime.module.css'
import s from './BestTimes.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'
import Tabs from './Tabs'
import StatsList from './StatsList'

const tabs = [
  { id: 'clean', name: 'No hints' },
  { id: 'hinted', name: 'Hints used' },
]

const artTab = { id: 'art', name: 'Art' }

//a size a row, a level a column, a dash for a slot with no time yet (faint when it can't be dealt)
const BestTimes = ({ key, title, sizes, levelNames, allowed, state, actions, art = false }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleBestTime()}>
    <Dialog title={title} onClose={actions.toggleBestTime}>
      <div class={b.root}>
        <Tabs
          tabs={art ? [...tabs, artTab] : tabs}
          active={state.tab}
          onSelect={actions.setBestTimeTab}
        />
        <table class={s.table}>
          <thead>
            <tr>
              <th />
              {levelNames.map((name) => (
                <th class={s.level}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.map((n) => (
              <tr>
                <th class={s.size}>
                  {n} × {n}
                </th>
                {levelNames.map((_, level) => {
                  const ok = allowed(n, level)
                  const best = ok && state[state.tab][`${n}.${level}`]
                  return (
                    <td class={s.slot}>
                      {!ok && <span class={s.never}>–</span>}
                      {ok && !best.set && <span class={s.empty}>–</span>}
                      {best && best.set && <span class={s.time}>{best.time} s</span>}
                      {best && best.set && <span class={s.name}>{best.name}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {state.stats && <StatsList stats={state.stats} />}
        <div class={b.footer}>
          <Button type="button" onClick={actions.resetBestTime}>
            <span class={b.button}>Reset Scores</span>
          </Button>
          <Button type="button" onClick={actions.resetStats}>
            <span class={b.button}>Reset Stats</span>
          </Button>
          <Button type="button" onClick={actions.toggleBestTime} onCreate={(el) => el.focus()}>
            <span class={b.button}>OK</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default BestTimes
