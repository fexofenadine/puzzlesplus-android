import { app, h } from 'hyperapp'
import './seed'
import '../app.css'
import b from '../shell/BackgroundSettings.module.css'
import s from './Settings.module.css'
import Dialog from '../Dialog'
import d from '../Dialog.module.css'
import Button from '../Button'
import { Control } from '../shell/BackgroundSettings'
import {
  backgroundFor,
  backgrounds,
  configure,
  defaults,
  loadSettings,
  optionsOf,
  saveSettings,
  startBackgrounds,
} from '../shell/backgrounds'
import { defaultEffects, effects, effectsOf, loadEffects, saveEffects } from '../shell/glitches'
import { loadMotion, motions, saveMotion } from '../shell/motion'
import { themes } from '../shell/themes'
import { load, save } from '../shell/storage'
import { MINUTES, loadOptions, rates, saveOptions } from './options'

//the screensaver's settings (/c), also the android live wallpaper's: its theme and timing, the
//theme's background and every glitch, and the wallpaper's frame rate and drift
//each change shows at once on the background behind and is saved straight away

const tauri = () => window.__TAURI__?.core
//the android app's wallpaper settings screen gives the page close() and apply()
const android = () => window.PuzzlesWallpaper

const close = () => {
  if (android()) android().close()
  else if (tauri()) tauri().invoke('quit')
  else window.close()
}

const themeName = (id) => themes.find(([theme]) => theme === id)?.[1] || id

const state = {
  theme: load('theme') || 'classic',
  ...loadOptions(),
  motion: loadMotion(),
  backgrounds: loadSettings(),
  effects: loadEffects(),
}

const actions = {
  setTheme: (theme) => {
    save('theme', theme)
    document.documentElement.dataset.theme = theme
    return { theme }
  },
  //random, minutes, fps or drift
  setOption:
    (change) =>
    ({ random, minutes, fps, drift }) => {
      saveOptions({ random, minutes, fps, drift, ...change })
      return change
    },
  setMotion: (motion) => {
    saveMotion(motion)
    return { motion }
  },
  setBackground:
    ([id, key, value]) =>
    ({ backgrounds: all }) => {
      const next = { ...all, [id]: { ...all[id], [key]: value } }
      saveSettings(next)
      configure(id, next[id])
      return { backgrounds: next }
    },
  resetBackground:
    (id) =>
    ({ backgrounds: all }) => {
      const next = { ...all, [id]: defaults(id) }
      saveSettings(next)
      configure(id, next[id])
      return { backgrounds: next }
    },
  setEffect:
    ([id, on]) =>
    ({ effects: chosen }) => {
      const next = { ...chosen, [id]: on }
      saveEffects(next)
      return { effects: next }
    },
  resetEffects: () => {
    const next = defaultEffects()
    saveEffects(next)
    return { effects: next }
  },
}

const minutesOption = {
  type: 'range',
  ...MINUTES,
  format: (value) => (value === 1 ? '1 minute' : `${value} minutes`),
}

const Row = ({ name }, children) => (
  <label class={b.row}>
    <span class={b.name}>{name}</span>
    {children}
  </label>
)

const Choice = ({ value, choices, onChange }) => (
  <span class={b.frame}>
    <select class={b.select} onchange={(event) => onChange(event.target.value)}>
      {choices.map(([choice, name]) => (
        <option value={choice} selected={choice === value}>
          {name}
        </option>
      ))}
    </select>
  </span>
)

const Check = ({ checked, onChange }) => (
  <input
    type="checkbox"
    class={b.check}
    checked={checked}
    onchange={(event) => onChange(event.target.checked)}
  />
)

//the theme, whether it changes at random and how often, and motion
const ThemePart = ({ state, actions }) => [
  <Row name="Theme:">
    <Choice value={state.theme} choices={themes} onChange={actions.setTheme} />
  </Row>,
  <Row name="Change theme at random:">
    <Check checked={state.random} onChange={(random) => actions.setOption({ random })} />
  </Row>,
  state.random && (
    <Row name="Every:">
      <Control
        option={minutesOption}
        value={state.minutes}
        onChange={(minutes) => actions.setOption({ minutes })}
      />
    </Row>
  ),
  <Row name="Motion:">
    <Choice value={state.motion} choices={motions} onChange={actions.setMotion} />
  </Row>,
  android() && (
    <Row name="Frame rate:">
      <Choice
        value={String(state.fps)}
        choices={rates.map(([fps, name]) => [String(fps), name])}
        onChange={(fps) => actions.setOption({ fps: Number(fps) })}
      />
    </Row>
  ),
  android() && (
    <Row name="Drift with the home screens:">
      <Check checked={state.drift} onChange={(drift) => actions.setOption({ drift })} />
    </Row>
  ),
]

//the shown theme's background, every one of its options
const BackgroundPart = ({ state, actions }) => {
  const id = backgroundFor(state.theme)
  if (!id) return null
  return [
    <p class={s.group}>{backgrounds[id].name}</p>,
    optionsOf(id).map((option) => (
      <Row name={`${option.label}:`}>
        <Control
          option={option}
          value={state.backgrounds[id][option.key]}
          onChange={(value) => actions.setBackground([id, option.key, value])}
        />
      </Row>
    )),
    <p class={b.credit}>{backgrounds[id].credit}</p>,
    <div class={s.buttons}>
      <Button type="button" onClick={() => actions.resetBackground(id)}>
        <span class={b.button}>Defaults</span>
      </Button>
    </div>,
  ]
}

//the counters' glitches and the lost board's meltdown belong to the games
const GAMES_ONLY = ['lcd', 'lost']

//the glitches: the shown theme's, or every theme's when they change at random
const GlitchPart = ({ state, actions }) => {
  const list = (state.random ? effects : effectsOf(state.theme)).filter(
    (effect) => !GAMES_ONLY.includes(effect.id),
  )
  if (!list.length)
    return [<p class={s.group}>Glitches</p>, <p class={b.credit}>None on this theme.</p>]
  const named = (effect) =>
    state.random ? `${effect.name} (${effect.themes.map(themeName).join(', ')})` : effect.name
  return [
    <p class={s.group}>Glitches</p>,
    list.map((effect) => (
      <Row name={named(effect)}>
        <Check
          checked={state.effects[effect.id]}
          onChange={(on) => actions.setEffect([effect.id, on])}
        />
      </Row>
    )),
    <p class={b.credit}>
      Torn bands, corrupted columns and signal drops show only over the animated background. Nothing
      glitches under Reduced Motion.
    </p>,
    <div class={s.buttons}>
      <Button type="button" onClick={actions.resetEffects}>
        <span class={b.button}>Defaults</span>
      </Button>
    </div>,
  ]
}

//on a phone the dialog grows to the screen's width, up to half as big again, so it can be read
const grow = (room) => {
  if (!android()) return
  requestAnimationFrame(() => {
    const dialog = room.querySelector(`.${d.dialog}`)
    if (!dialog?.offsetWidth) return
    const scale = Math.min(1.5, Math.floor(((innerWidth - 24) / dialog.offsetWidth) * 100) / 100)
    if (scale > 1) dialog.style.setProperty('--scale', scale)
  })
}

const view = (state, actions) => (
  <main
    onkeydown={(event) => event.key === 'Escape' && close()}
    oncreate={() => startBackgrounds()}
  >
    <div id="looks" />
    <div class={s.room} oncreate={grow}>
      <Dialog
        title={android() ? 'Puzzles Plus Wallpaper' : 'Puzzles Plus Screensaver'}
        onClose={close}
      >
        <form class={`${b.root} ${s.form}`} autocomplete="off" onsubmit={(e) => e.preventDefault()}>
          <ThemePart state={state} actions={actions} />
          <BackgroundPart state={state} actions={actions} />
          <GlitchPart state={state} actions={actions} />
          <div class={b.footer}>
            {android() && (
              <Button type="button" onClick={() => android().apply()}>
                <span class={b.button}>Apply</span>
              </Button>
            )}
            {tauri() && (
              <Button type="button" onClick={() => tauri().invoke('preview')}>
                <span class={b.button}>Preview</span>
              </Button>
            )}
            <Button type="button" onClick={close}>
              <span class={b.button}>Close</span>
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  </main>
)

app(state, actions, view, document.getElementById('app'))
