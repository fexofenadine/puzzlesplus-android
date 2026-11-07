import { h } from 'hyperapp'

//the window, themes and shortcuts every game shares, the last section of each guide's first part
export const desktopSection = {
  id: 'window',
  title: 'The window and themes',
  body: () => [
    <p>
      Every game runs in a Windows style window on a desktop, with a taskbar along the bottom. The
      Start button opens any game, this guide and the others, and the short How to Play page. The
      taskbar has a button for each game, and its tray holds the boss key and a clock.
    </p>,
    <ul>
      <li>
        <b>Minimise</b> hides the window and pauses the game, and its taskbar button brings it back
        still paused. <b>Maximise</b> scales the window to fill the page, keeping its shape.{' '}
        <b>Close</b> ends the game and asks which game to open next.
      </li>
      <li>
        <b>View</b> zooms the window in steps from 50% to 400%, also with + and -. Double-clicking
        the title bar goes back to 100%. When a board is too big for the screen the window shrinks
        to fit, but not below about 10 pixel cells, where the page scrolls instead.
      </li>
      <li>
        <b>Pause</b> (the title bar button or P) stops the clock and hides the board. The game also
        pauses when you switch tabs or windows, and waits for you to press play. A game in progress
        is kept when you leave or reload the page, and comes back paused at the same time.
      </li>
      <li>
        <b>Timer</b> in the Game menu turns the clock off. It shows dashes, and a game played with
        the timer off at any point doesn't count for best times.
      </li>
      <li>
        <b>The boss key</b> (Esc or the tray's Esc button) covers the screen with a spreadsheet of
        made up figures and pauses the game. Press it again, or click the 100% in its status bar, to
        come back.
      </li>
      <li>
        <b>Shortcuts</b>: F2 or N starts a new game, H asks for a hint, P pauses, + and - zoom and
        Esc is the boss key. They are ignored while typing in a dialog or with Ctrl, Alt or Cmd
        held, except Ctrl+Z for undo.
      </li>
    </ul>,
    <p>
      The <b>Theme</b> menu picks one of six looks, shared by every game and remembered:
    </p>,
    <ul>
      <li>
        <b>Classic</b>, the Windows look, over a hill photo or, from Background Settings, a live
        Bliss style sky with drifting clouds.
      </li>
      <li>
        <b>Synthwave</b>, neon over a wireframe landscape with VHS scanlines and tape wobble.
      </li>
      <li>
        <b>Matrix</b>, green on black over falling code rain, ported from xscreensaver's GLMatrix.
      </li>
      <li>
        <b>Nord</b>, over xscreensaver's Substrate, which grows cracks across the screen.
      </li>
      <li>
        <b>Solarized Truchet</b> and <b>Solarized Phosphor</b>, over winding Truchet tiles or a
        glass terminal typing out this game's own source code.
      </li>
    </ul>,
    <p>
      Background Settings (in the Theme menu, on every theme but Synthwave) has the options of the
      xscreensaver originals, previews them live and can switch the animation off for a still
      picture.
    </p>,
  ],
}
