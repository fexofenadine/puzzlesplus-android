import { h } from 'hyperapp'
import b from '../BestTime.module.css'
import s from '../shell/BestTimes.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'
import Tabs from '../shell/Tabs'
import { sizes } from './rules'

const tabs = [
  { id: 'clean', name: 'No help' },
  { id: 'hinted', name: 'Hints or undo' },
]

//a size a row: the best score, the highest tile of that game and who made it
const BestScores = ({ key, state, actions }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleBestTime()}>
    <Dialog title="Best 2048 Scores" onClose={actions.toggleBestTime}>
      <div class={b.root}>
        <Tabs tabs={tabs} active={state.tab} onSelect={actions.setBestTimeTab} />
        <table class={s.table}>
          <thead>
            <tr>
              <th />
              <th class={s.level}>Score</th>
              <th class={s.level}>Tile</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((n) => {
              const best = state[state.tab][n]
              return (
                <tr>
                  <th class={s.size}>
                    {n} × {n}
                  </th>
                  <td class={s.slot}>
                    {best.score > 0 && <span class={s.time}>{best.score}</span>}
                    {best.score > 0 && <span class={s.name}>{best.name}</span>}
                  </td>
                  <td class={s.slot}>{best.tile > 0 && best.tile}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div class={b.footer}>
          <Button type="button" onClick={actions.resetBestTime}>
            <span class={b.button}>Reset Scores</span>
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
