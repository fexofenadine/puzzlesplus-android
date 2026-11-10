import { h } from 'hyperapp'
import s from './Pictures.module.css'
import a from '../shell/About.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'
import { artFor, levelOf } from './art'
import { levelNames } from './Menu'

//one square for each filled cell, as a single path
const outline = ({ cells, n }) =>
  [...cells.keys()]
    .filter((i) => cells[i])
    .map((i) => `M${i % n} ${Math.floor(i / n)}h1v1h-1z`)
    .join('')

//a picture shows once solved, until then only its level
const Thumb = ({ art, solved }) =>
  solved ? (
    <svg class={s.thumb} viewBox={`0 0 ${art.n} ${art.n}`} shape-rendering="crispEdges">
      <path d={outline(art)} />
    </svg>
  ) : (
    <span class={s.thumb}>?</span>
  )

//the pool for the board's size, the solved ones drawn, the rest hidden so they stay a surprise
const Pictures = ({ key, state, actions }) => {
  const { n } = state.game
  const pool = artFor(n)
  return (
    <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.togglePictures()}>
      <Dialog title="Choose Picture" onClose={actions.togglePictures}>
        <div class={s.root}>
          <p class={s.text}>
            {pool.length
              ? `Pick a ${n} × ${n} picture to solve. Times aren't kept for a picture you choose.`
              : `There are no ${n} × ${n} pictures yet.`}
          </p>
          <ul class={s.list}>
            {pool.map((art) => {
              const solved = state.solved.includes(art.id)
              return (
                <li>
                  <button
                    type="button"
                    class={s.option}
                    onclick={() => actions.choosePicture(art.id)}
                  >
                    <Thumb art={art} solved={solved} />
                    <span class={s.label}>{solved ? art.name : 'Unsolved'}</span>
                    <span class={s.level}>{levelNames[levelOf(art)]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div class={s.footer}>
            <Button type="button" onClick={actions.togglePictures} onCreate={(el) => el.focus()}>
              <span class={a.button}>Cancel</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </Overlay>
  )
}

export default Pictures
