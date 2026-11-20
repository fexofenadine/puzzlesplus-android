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
        <b>Display</b> zooms the window in steps from 50% to 400%, also with + and -.
        Double-clicking the title bar goes back to 100%. When a board is too big for the screen the
        window shrinks to fit, but not below about 10 pixel cells, where the page scrolls instead.
      </li>
      <li>
        <b>Moving</b>: drag a window or dialog by its title bar with the mouse. As in Windows 95, an
        outline follows and the window jumps there when you let go (Esc lets go without moving it).
        Windows come back to the middle when the page is opened again.
      </li>
      <li>
        <b>Pause</b> (the title bar button, the one beside the hint on larger boards, or P) stops
        the clock and hides the board. The game also pauses when you switch tabs or windows, and
        waits for you to press play. A game in progress is kept when you leave or reload the page,
        and comes back paused at the same time.
      </li>
      <li>
        <b>Timer</b> in the Game menu turns the clock off. It shows dashes, and a game played with
        the timer off at any point doesn't count for best times.
      </li>
      <li>
        <b>Daily Puzzle</b> in Takuzu's, Nonograms' and Sudoku's Game menu deals the day's board,
        the same for everyone. Solving it counts the day, days in a row make a streak, and the Best
        Times box shows today's time, your fastest and your streaks.
      </li>
      <li>
        <b>Copy Link</b> in the same menus makes a link to the board in play. Anyone who opens it
        gets the same board from its start. A board from a link keeps no best time.
      </li>
      <li>
        <b>Backup</b> in the Start menu saves everything kept in this browser (settings, best times,
        statistics and games in progress) as a file or as text, and restores it in another browser
        or the app.
      </li>
      <li>
        <b>The boss key</b> (Esc or the tray's Esc button) covers the screen with a spreadsheet of
        made up figures and pauses the game. Press it again, or click the 100% in its status bar, to
        come back.
      </li>
      <li>
        <b>Shortcuts</b>: F2 or N starts a new game, H asks for a hint, P pauses, + and - zoom and
        Esc is the boss key. They are ignored while typing in a dialog or with Ctrl, Alt or Cmd
        held, except Ctrl+Z for undo and Ctrl+Y for redo. While a dialog is open the keys are its
        own.
      </li>
    </ul>,
    <p>
      Display → <b>Theme</b> picks one of eight looks, shared by every game and remembered:
    </p>,
    <ul>
      <li>
        <b>Classic</b>, the Windows look, over a hill photo or, with Animated switched on in the
        Display menu, a blue sky of drifting clouds.
      </li>
      <li>
        <b>Synthwave</b>, a slow flight through glowing neon triangles with VHS scanlines and
        glitches that tear and jump, or, where the graphics card can't keep up or with Animated
        switched off, neon over a wireframe landscape.
      </li>
      <li>
        <b>Matrix</b>, green on black over falling code rain, ported from xscreensaver's GLMatrix,
        behind CRT scanlines, with bands that tear and columns that garble now and then.
      </li>
      <li>
        <b>Nord</b>, over xscreensaver's Substrate, which grows cracks across the screen.
      </li>
      <li>
        <b>Solarized Truchet</b> and <b>Solarized Phosphor</b>, over winding Truchet tiles or a
        glass terminal typing out this game's own source code.
      </li>
      <li>
        <b>Vaporwave</b>, Windows 95 in pastels over a worn VHS tape: a pastel day on a checkerboard
        floor, with bouncing lines that leave trails, like the Mystify screensaver, playing over it.
      </li>
      <li>
        <b>Terafox Hex Trail</b>, deep teals and sea greens, over lines that grow across a
        honeycomb.
      </li>
    </ul>,
    <p>
      Background Settings (in the Display menu) has the options of the xscreensaver originals,
      previews them live and can switch the animation off for a still picture.
    </p>,
    <p>
      On Synthwave, Vaporwave and Matrix, Display → Glitches switches each screen effect on or off:
      the glitches that come now and then at random, and the scanlines, tracking band, grain and
      flicker that stay, laid over the whole screen but the boards and buttons. Signal drops on
      Matrix start off. Nothing glitches under Reduced Motion.
    </p>,
  ],
}
