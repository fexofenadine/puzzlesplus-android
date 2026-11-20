import { app, h } from 'hyperapp'
import '../app.css'
import s from './Home.module.css'
import g from '../guide/Guide.module.css'
import m from '../Menu.module.css'
import Dialog from '../Dialog'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss from '../shell/Boss'
import Taskbar, { icons } from '../shell/Taskbar'
import home from '../shell/icons/home.svg'
import DisplayMenu from '../shell/DisplayMenu'
import { games } from '../shell/GameLinks'
import { isGame, listen, shellActions, shellState, shortcut } from '../shell/actions'
import { startBackgrounds } from '../shell/backgrounds'
import { load } from '../shell/storage'

//what each game is, in a line, for its card
const about = {
  minesweeper:
    'Clear the board without touching a mine. Hints explain themselves, and No Guessing boards never need a guess.',
  takuzu:
    'Fill the grid with zeros and ones: never three alike in a row, equal counts, no repeated line.',
  nonograms: 'Fill in a hidden picture from the number clues beside every row and column.',
  sudoku: 'Every row, column and box holds each digit once, on 4x4, 6x6 and 9x9 boards.',
  2048: 'Slide the tiles and merge equal ones to make 2048, and go on from there.',
  lightup: 'Place bulbs to light every square, never two bulbs lighting each other.',
  futoshiki: 'A Latin square with greater and less than signs between some of its cells.',
}

const Card = ({ id, title }) => (
  <li class={s.card}>
    <a class={s.play} href={`${id}/`}>
      <img src={icons[id]} alt="" width="32" height="32" />
      <span class={s.name}>{title}</span>
      <span class={s.text}>{about[id]}</span>
    </a>
    <div class={s.links}>
      <a href={`${id}/guide/`}>{title} guide</a>
    </div>
  </li>
)

//the home page: a window of every game, the one played last first
export const startHome = () => {
  const saved = load('lastGame')
  const last = isGame(saved) ? saved : null
  const state = { ...shellState('home', './'), last }
  const actions = {
    ...shellActions,
    init: () => (state, actions) => {
      window.addEventListener('keydown', actions.press)
      listen(actions)
    },
    //only esc means anything here, the zoom keys belong to the games
    press: (event) => (state, actions) => {
      if (event.keyCode === 27) shortcut(event, state, actions)
    },
    pause: () => null,
    reset: () => null,
    closeGame: () => (state, actions) => actions.finishClose(),
  }
  const title = 'Puzzles Plus'
  const view = (state, actions) => (
    <main oncreate={actions.init}>
      <div key="a" class={g.page}>
        <Dialog hidden={state.windowState !== 'open'} title={title}>
          <ul class={m.root} tabindex={-1} onfocusout={actions.toggleMenu}>
            <DisplayMenu state={state} actions={actions} />
          </ul>
          <div class={s.body}>
            <div class={s.panel}>
              <h2 class={s.heading}>Choose a game</h2>
              <p class={s.lead}>
                Seven puzzles with hints that explain their reasoning, in eight themes.
              </p>
              {state.last && (
                <ul class={`${s.cards} ${s.continue}`} aria-label="Continue">
                  <li class={s.card}>
                    <a class={s.play} href={`${state.last}/`}>
                      <img src={icons[state.last]} alt="" width="32" height="32" />
                      <span class={s.name}>
                        Continue {games.find(([id]) => id === state.last)[1]}
                      </span>
                      <span class={s.text}>Pick up where you left off.</span>
                    </a>
                  </li>
                </ul>
              )}
              <ul class={s.cards}>
                {games.map(([id, name]) => (
                  <Card id={id} title={name} />
                ))}
              </ul>
              <p class={s.footer}>
                <a href="how-to-play/">How to play every game</a>
              </p>
            </div>
          </div>
        </Dialog>
      </div>
      <Taskbar key="h" own={{ title, icon: home }} state={state} actions={actions} />
      {state.backgroundSettings && (
        <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
      )}
      {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
    </main>
  )
  app(state, actions, view, document.getElementById('app'))
  startBackgrounds()
}
