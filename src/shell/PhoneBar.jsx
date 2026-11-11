import { h } from 'hyperapp'
import s from './PhoneBar.module.css'
import { games } from './GameLinks'
import { book, help, icons } from './Taskbar'
import { backgroundFor } from './backgrounds'
import avatar from './avatar.png'
import { pageUrl } from './phone'
import { clockText } from './ResumeItems'
import Backup from './BackupBox'
import Share from './ShareBox'
import classic from './chips/classic.webp'
import synthwave from './chips/synthwave.webp'
import matrix from './chips/matrix.webp'
import nord from './chips/nord.webp'
import solarized from './chips/solarized.webp'
import phosphor from './chips/solarized-phosphor.webp'

//material symbols paths (apache 2.0)
const MENU = 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z'
const BACK = 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'
const PAUSE = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'
const PLAY = 'M8 5v14l11-7z'
const NEW =
  'M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'
const HINT =
  'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z'
const TUNE =
  'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z'
const CHECK = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
const INFO =
  'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'
export const TROPHY =
  'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z'
const WALLPAPER =
  'M4 4h7V2H4c-1.1 0-2 .9-2 2v7h2V4zm6 9l-4 5h12l-3-4-2.03 2.71L10 13zm7-4.5c0-.83-.67-1.5-1.5-1.5S14 7.67 14 8.5s.67 1.5 1.5 1.5S17 9.33 17 8.5zM20 2h-7v2h7v7h2V4c0-1.1-.9-2-2-2zm0 18h-7v2h7c1.1 0 2-.9 2-2v-7h-2v7zM4 13H2v7c0 1.1.9 2 2 2h7v-2H4v-7z'

//short names and a picture of each theme for the theme picker: a piece of its background
//under a glyph in its look, drawn by chips/source/chips.py
const themeChips = [
  ['classic', 'Classic', classic],
  ['synthwave', 'Synthwave', synthwave],
  ['matrix', 'Matrix', matrix],
  ['nord', 'Nord', nord],
  ['solarized', 'Solarized', solarized],
  ['solarized-phosphor', 'Phosphor', phosphor],
]

//more material symbols: today, redo, link, save alt
const TODAY =
  'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z'
const REDO =
  'M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z'
const LINK =
  'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'
const SAVE =
  'M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z'

const Icon = ({ d, class: name }) => (
  <svg class={name} width="24" height="24" viewBox="0 0 24 24">
    <path d={d} />
  </svg>
)

const BarButton = ({ title, d, disabled, onClick }) => (
  <button type="button" class={s.button} title={title} disabled={disabled} onclick={onClick}>
    <Icon d={d} />
  </button>
)

//a group of the side panel or sheet, its label optional
export const Section = ({ label }, children) => (
  <section class={s.section}>
    {label && <div class={s.label}>{label}</div>}
    {children}
  </section>
)

//one tap picks, the chosen one is marked; picking closes the panel
//options are [value, name, disabled?, swatch?]; kind is chips, segments (sizes) or swatches (themes)
export const Chips = ({ label, options, value, onPick, actions, kind = 'chips' }) => [
  label && <div class={s.label}>{label}</div>,
  <div class={s[kind]}>
    {options.map(([option, name, disabled, swatch]) => (
      <button
        type="button"
        class={option === value ? s.chipOn : s.chip}
        disabled={disabled}
        onclick={() => {
          //a theme picked stays in view, so the sheet stays open
          if (kind !== 'swatches') actions.closeDrawer()
          onPick(option)
        }}
      >
        {swatch && <span class={s.swatch} style={{ backgroundImage: `url(${swatch})` }} />}
        {!swatch && option === value && <Icon class={s.tick} d={CHECK} />}
        <span class={s.chipName}>{name}</span>
      </button>
    ))}
  </div>,
]

//an option that stays open so several can be changed: a switch, or a windows 95 checkbox on classic
export const Check = ({ name, checked, onToggle }) => (
  <button type="button" class={s.row} role="switch" aria-checked={checked} onclick={onToggle}>
    <span class={checked ? s.checkOn : s.check} />
    <span class={s.rowName}>{name}</span>
  </button>
)

//an action that closes the panel, then runs; icon is an image, d a material symbol
export const Item = ({ icon, d, name, end, active, onClick, actions }) => (
  <button
    type="button"
    class={active ? s.itemOn : s.item}
    onclick={() => {
      actions.closeDrawer()
      onClick()
    }}
  >
    <span class={s.glyph}>
      {icon ? <img src={icon} alt="" width="24" height="24" /> : <Icon d={d} />}
    </span>
    <span class={s.rowName}>{name}</span>
    {end && <span class={s.end}>{end}</span>}
  </button>
)

//the day's board, redo and a link to the board, for the games that have them
export const PlayItems = ({ state, actions }) => [
  <Item
    d={TODAY}
    name="Daily puzzle"
    active={Boolean(state.game.daily)}
    onClick={() => actions.newGame({ daily: true })}
    actions={actions}
  />,
  <Item d={REDO} name="Redo" onClick={() => actions.redo()} actions={actions} />,
  <Item d={LINK} name="Copy link" onClick={() => actions.share()} actions={actions} />,
]

//a slider that applies as it moves
const Range = ({ name, value, onInput }) => (
  <label class={s.range}>
    <span class={s.rowName}>{name}</span>
    <input
      type="range"
      min="0"
      max="100"
      step="5"
      value={value}
      oninput={(event) => onInput(Number(event.target.value))}
    />
    <span class={s.value}>{value}%</span>
  </label>
)

const go = (href) => () => location.assign(pageUrl(href))

//a phone's top bar, with the side panel of places behind its menu button and the options
//sheet behind its tune button (the game's own sections are children, then the look);
//back makes it a page's bar instead, with only a back arrow
const PhoneBar = (
  { key, title, page, root = '../', back, paused, canPause, look, state, actions },
  children,
) => {
  const name = page && games.find(([id]) => id === page)[1]
  return (
    <div
      key={key}
      oncreate={() => {
        //a game's bar splits down the sides of a screen held sideways, the stylesheet makes room
        if (!back) document.documentElement.dataset.sides = ''
      }}
    >
      {back ? (
        <header class={s.bar}>
          <a class={s.button} href={pageUrl(back)} title="Back">
            <Icon d={BACK} />
          </a>
          <span class={s.title}>{title}</span>
        </header>
      ) : (
        <header class={s.split}>
          <div class={s.side}>
            <BarButton title="Menu" d={MENU} onClick={() => actions.toggleDrawer()} />
            <BarButton title="New game" d={NEW} onClick={() => actions.newGame()} />
            <BarButton title="Hint" d={HINT} onClick={() => actions.hint()} />
          </div>
          {/*the side panel says puzzles plus, so the bar has room for the game's own name*/}
          <span class={s.title}>{(title || '').replace(/ Plus$/, '')}</span>
          <div class={s.side}>
            <BarButton title="Best times" d={TROPHY} onClick={() => actions.toggleBestTime()} />
            <BarButton
              title={paused ? 'Resume' : 'Pause'}
              d={paused ? PLAY : PAUSE}
              disabled={!canPause}
              onClick={() => actions.pause()}
            />
            <BarButton title="Options" d={TUNE} onClick={() => actions.toggleSheet()} />
          </div>
        </header>
      )}
      {(state.drawer || state.sheet) && (
        <div class={s.shade} onclick={() => actions.closeDrawer()} />
      )}
      {state.drawer && (
        <nav class={s.drawer}>
          <div class={s.head}>
            <img src={avatar} alt="" width="36" height="36" />
            Puzzles Plus
          </div>
          <Section label="Games">
            {games.map(([id, gameName]) => (
              <Item
                icon={icons[id]}
                name={gameName}
                active={id === page}
                onClick={id === page ? () => {} : go(`${root}${id}/`)}
                actions={actions}
              />
            ))}
          </Section>
          {state.shelf && state.shelf.length > 0 && (
            <Section label="Resume">
              {state.shelf.map(({ id, label, elapsed }) => (
                <Item
                  d={PLAY}
                  name={label}
                  end={clockText(elapsed)}
                  onClick={() => actions.resumeGame(id)}
                  actions={actions}
                />
              ))}
            </Section>
          )}
          <Section>
            <Item icon={book} name={`${name} guide`} onClick={go('guide/')} actions={actions} />
            <Item
              icon={help}
              name="How to play every game"
              onClick={go(`${root}how-to-play/`)}
              actions={actions}
            />
            <Item d={SAVE} name="Backup" onClick={actions.toggleBackup} actions={actions} />
            <Item d={INFO} name="About" onClick={actions.toggleAbout} actions={actions} />
          </Section>
        </nav>
      )}
      {state.sheet && (
        <div class={s.sheet}>
          <div class={s.handle} />
          <div class={s.sheetTitle}>{name} options</div>
          {children}
          <Section label="Theme">
            <Chips
              options={themeChips.map(([id, themeName, swatch]) => [id, themeName, false, swatch])}
              value={state.theme}
              onPick={actions.setTheme}
              actions={actions}
              kind="swatches"
            />
            {look}
            <Check name="Fireworks" checked={state.fireworks} onToggle={actions.toggleFireworks} />
            <Range
              name="Window"
              value={state.glass.opacity}
              onInput={(opacity) => actions.setOpacity(opacity)}
            />
            <Check
              name="Hide window"
              checked={state.glass.hidden}
              onToggle={actions.toggleHideWindow}
            />
            {state.theme !== 'classic' && (
              <Check
                name="Board without frame"
                checked={state.card}
                onToggle={actions.toggleCard}
              />
            )}
            <Item
              d={WALLPAPER}
              name={backgroundFor(state.theme) ? 'Background settings' : 'Window settings'}
              onClick={actions.toggleBackgroundSettings}
              actions={actions}
            />
          </Section>
        </div>
      )}
      {state.share && <Share key="share" state={state.share} actions={actions} />}
      {state.backup && <Backup key="backup" state={state.backup} actions={actions} />}
    </div>
  )
}

export default PhoneBar
