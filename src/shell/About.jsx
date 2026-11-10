import { h } from 'hyperapp'
import s from './About.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'

export const Link = ({ href }, children) => (
  <a class={s.link} href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
)

//the about box every game shares: the game and its author, the game's own paragraphs, where
//puzzles plus came from, the repository, then the credits folded away
//credits are a game's own list items, shown before the shared ones
const About = ({ key, name, actions, credits }, children) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleAbout()}>
    <Dialog title={`About ${name}`} onClose={actions.toggleAbout}>
      <div class={s.root}>
        <p class={s.name}>Puzzles Plus: {name}</p>
        <p class={s.author}>by fexofenadine</p>
        {children}
        <p>
          Puzzles Plus began as a fork of{' '}
          <Link href="https://github.com/frenzzy/minesweeper">Minesweeper</Link> by Vladimir Kutepov
          and has grown far beyond it: five games, hints that explain their reasoning, guides,
          themes and animated backgrounds, with little of the original left outside the Classic
          Minesweeper board. Released under the MIT licence.
        </p>
        <p>
          <Link href="https://github.com/fexofenadine/puzzlesplus">
            github.com/fexofenadine/puzzlesplus
          </Link>
        </p>
        <details class={s.credits}>
          <summary>Credits</summary>
          <ul>
            {credits}
            <li>
              The window, Classic theme and Minesweeper board come from{' '}
              <Link href="https://github.com/frenzzy/minesweeper">Minesweeper</Link> by Vladimir
              Kutepov (MIT licence).
            </li>
            <li>
              Backgrounds are canvas ports of GLMatrix, Substrate, Truchet and Phosphor from
              xscreensaver, under the xscreensaver licence.
            </li>
            <li>Fonts are under the SIL Open Font License and LGPL 2.1.</li>
            <li>Photos are from Unsplash, and CC0 photos from Wikimedia Commons.</li>
            <li>Colour schemes: SynthWave '84, Solarized and Nord.</li>
            <li>Full credits and licences are in the README.</li>
          </ul>
        </details>
        <div class={s.footer}>
          <Button type="button" onClick={actions.toggleAbout} onCreate={(el) => el.focus()}>
            <span class={s.button}>OK</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default About
