import { h } from 'hyperapp'
import b from '../BestTime.module.css'
import s from '../shell/BestTimes.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'
import Tabs from '../shell/Tabs'
import StatsList from '../shell/StatsList'
import { sizes } from './rules'
import { PLACES } from './records'

const tabs = [
  { id: 'clean', name: 'No help' },
  { id: 'hinted', name: 'Hints or undo' },
]

const places = Array.from({ length: PLACES }, (_, place) => place)

//a place a row, a size a column: the score, then the highest tile of that game and who made it
const BestScores = ({ key, state, actions }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleBestTime()}>
    <Dialog title="Best 2048 Scores" onClose={actions.toggleBestTime}>
      <div class={b.root}>
        <Tabs tabs={tabs} active={state.tab} onSelect={actions.setBestTimeTab} />
        <table class={s.table}>
          <thead>
            <tr>
              <th />
              {sizes.map((n) => (
                <th class={s.level}>
                  {n} × {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {places.map((place) => (
              <tr>
                <th class={s.size}>{place + 1}</th>
                {sizes.map((n) => {
                  const best = state[state.tab][n][place]
                  return (
                    <td class={s.slot}>
                      {!best && <span class={s.empty}>–</span>}
                      {best && <span class={s.time}>{best.score}</span>}
                      {best && (
                        <span class={s.name}>
                          {best.tile} · {best.name}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {state.stats && <StatsList stats={state.stats} wonLabel="Made the target" losses />}
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

export default BestScores
