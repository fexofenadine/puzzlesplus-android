# <img src="docs/puzzlesplus.png" alt="" width="48" align="top"> Puzzles Plus

Windows style puzzle games with hints that explain their reasoning, boards you can solve by logic alone and animated themes ported from xscreensaver, on a little Windows 95 desktop with a taskbar and Start menu. All three games share the window, the six themes and their backgrounds, pause and the boss key, and your theme and zoom carry over between them.

| [Play Minesweeper Plus](https://fexofenadine.github.io/puzzlesplus/minesweeper/)                                        | [Play Takuzu Plus](https://fexofenadine.github.io/puzzlesplus/takuzu/)                              | [Play Nonograms Plus](https://fexofenadine.github.io/puzzlesplus/nonograms/)                                    |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [![Play Minesweeper Plus](public/minesweeper/minesweeper.jpg)](https://fexofenadine.github.io/puzzlesplus/minesweeper/) | [![Play Takuzu Plus](public/takuzu/takuzu.jpg)](https://fexofenadine.github.io/puzzlesplus/takuzu/) | [![Play Nonograms Plus](public/nonograms/nonograms.jpg)](https://fexofenadine.github.io/puzzlesplus/nonograms/) |

Each game has a guide, from the rules to every solving technique with worked examples: the [Minesweeper](https://fexofenadine.github.io/puzzlesplus/minesweeper/guide/), [Takuzu](https://fexofenadine.github.io/puzzlesplus/takuzu/guide/) and [Nonograms](https://fexofenadine.github.io/puzzlesplus/nonograms/guide/) guides. [How to Play](https://fexofenadine.github.io/puzzlesplus/how-to-play/) has all three games' rules in short.

## In pictures

| Classic: a hint with its More button, and the Start menu                       | Classic's animated hill: Takuzu with Show Errors                            |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| ![Minesweeper on Classic](docs/screenshots/classic-minesweeper.jpg)            | ![Takuzu over the animated hill](docs/screenshots/classic-hill-takuzu.webp) |
| **Synthwave: a lost Expert game glitching, and best times**                    | **Matrix: Nonograms with rain glyphs and a hint**                           |
| ![Minesweeper on Synthwave](docs/screenshots/synthwave-minesweeper.webp)       | ![Nonograms on Matrix](docs/screenshots/matrix-nonograms.webp)              |
| **Nord: 25 × 25 Expert maximised over Substrate, with the View menu**          | **Solarized Truchet, still: a full Takuzu board with a mistake**            |
| ![Nonograms on Nord](docs/screenshots/nord-nonograms.webp)                     | ![Takuzu on Solarized Truchet](docs/screenshots/solarized-takuzu.jpg)       |
| **Solarized Phosphor: Open Games after closing a window**                      | **A guide page, its example drawn by the game's own code**                  |
| ![Open Games on Solarized Phosphor](docs/screenshots/phosphor-open-games.webp) | ![The Takuzu guide](docs/screenshots/guide.jpg)                             |

**Expert turned on its side on a phone, over Matrix's still wallpaper**

<img src="docs/screenshots/portrait.jpg" alt="Expert turned on its side on a phone" width="260">

## Minesweeper Plus

A fork of [frenzzy/minesweeper](https://github.com/frenzzy/minesweeper), whose Classic theme still looks and plays like the original, plus:

- An **Extreme** level (39 × 21, 169 mines) beside Beginner, Intermediate, Expert and Custom.
- **Safe First Click** and **No Guessing**, which deals only boards logic alone can clear.
- **Hints** from the numbers you can see and your flags, explained under the board, and **chording** that explains itself when it can't open.
- Best times with and without hints, and wide boards turned on their side on portrait screens.

## Takuzu Plus

Fill the grid with 0s and 1s: no three alike in a row, as many 0s as 1s in every line, and no two rows or columns the same.

- Five levels from Easy to Expert and five sizes from 6 × 6 to 14 × 14, every board with one solution and graded by the reasoning it really needs.
- Hints that find broken rules and wrong cells before the next step, Show Errors, undo and a question when a full board is wrong.

## Nonograms Plus

Fill the cells whose runs match the clues beside each row and above each column, and a picture appears.

- Four levels and five sizes from 5 × 5 to 25 × 25, random pictures touched up until logic alone can finish them.
- Drag to paint along a line, crosses as notes, a fill or cross mode for touch screens, hints, Show Errors and undo.

## Every game

- **A desktop**: a taskbar with a Start menu, a button per game and a clock. Windows minimise to the taskbar, maximise to fill the page, and close to an Open Games dialog. Zoom from the View menu or with + and -.
- **Six themes**: Classic, Synthwave, Matrix, Nord, Solarized Truchet and Solarized Phosphor, most over an xscreensaver port with its original options, any of which can be switched to a still picture.
- **Hints with a More button** that opens their technique in the game's guide.
- **Pause**, automatic when you switch away, and a **boss key** (Esc) that hides everything behind a spreadsheet.
- Best times per level, with and without hints, and an offline-capable service worker.

## Under the hood

- Rebuilt on [Vite](https://vite.dev) with Vitest, ESLint and Prettier, replacing the abandoned hyperapp-tools webpack 4 setup.
- A plain static build with readable asset names, versioned links so browsers never mix old and new files, and a simple offline-capable service worker.
- Settings survive browsers that block site storage, falling back to the defaults.
- The games and their guides are pages of one build. Code the games share (the taskbar and window, themes, backgrounds, zoom, pause, the boss key, best times, settings storage, dealing in a worker) lives in `src/shell`, Minesweeper keeps the original's file layout in `src`, Takuzu and Nonograms have `src/takuzu` and `src/nonograms`, and the guides `src/guide`.
- The guides' examples are real positions from dealt boards, drawn with each game's own cells and captioned by its own hint code, and a test checks every one still shows its technique.
- Takuzu's and Nonograms' rules, solvers, the technique ladders behind hints and difficulty, and the generators are plain modules with no interface code, and boards are dealt in a web worker. Nonograms solves a line by dynamic programming over every way its clue can fit.
- Animated backgrounds are canvas ports in `src/shell/backgrounds`, one file each. A port declares its options and the settings dialog builds itself from them, so adding another xscreensaver hack needs no other code. Phosphor's source code text is only downloaded when that theme is used.
- Google Analytics removed.
- Tests for mine placement and the no-guessing solver, chording and its explanations, hints, best times, zoom and fitting, portrait boards and every background and its settings, and for Takuzu's rules, solver (checked against a brute force search), every technique, difficulty rating, generation at every size and level, hints that always agree with the solution, and playing, and the same for Nonograms, whose line solver is checked against a brute force search and whose boards are played to the end by following hints.

## Development

```sh
yarn          #install dependencies
yarn start    #dev server, the games are at /minesweeper/, /takuzu/ and /nonograms/
yarn build    #static site in build/
yarn test     #run tests
yarn lint     #lint
yarn deploy   #build and publish to github pages
```

Classic's hill (`src/shell/backgrounds/hill.webp` and `ridge.json`) is made from the CC0 source photo by `src/shell/backgrounds/hill.py`, which needs Python with Pillow and numpy. The theme fonts are converted by `src/fonts/convert.mjs`.

## Credits

- Takuzu, also known as Binairo, was devised by Frank Coussement and Peter De Schepper. This version's puzzles, solver and hints are its own.
- Nonograms were devised in 1987 by Non Ishida and, independently, Tetsuya Nishio. This version's pictures, solver and hints are its own.
- Forked from [frenzzy/minesweeper](https://github.com/frenzzy/minesweeper) by Vladimir Kutepov, bootstrapped with [Hyperapp Starter](https://github.com/kriasoft/hyperapp-starter).
- Classic background by [Chris Barbalis](https://unsplash.com/photos/green-grass-field-under-blue-sky--nYBR0LFTvQ) on Unsplash, colour matched to resemble Bliss.
- Classic's animated hill is cut from [Clouds above Cattle Hill, Roedean](<https://commons.wikimedia.org/wiki/File:Clouds_above_Cattle_Hill,_Roedean_(February_2011).JPG>) by Hassocks5489 (CC0), retouched, mirrored and colour matched to Bliss by `src/shell/backgrounds/hill.py`. Its sky and clouds are drawn live.
- Synthwave background by [Neeqolah Creative Works](https://unsplash.com/photos/a-computer-generated-image-of-a-sun-setting-in-the-distance-Tn5gnXGI3hI) on Unsplash.
- Synthwave colours from [SynthWave '84](https://github.com/robb0wen/synthwave-vscode) by Robb Owen.
- Matrix code rain is a canvas port of [GLMatrix](https://github.com/xscreensaver/xscreensaver/blob/master/hacks/glx/glmatrix.c) from xscreensaver by Jamie Zawinski.
- Matrix static background [Binary damage code](<https://commons.wikimedia.org/wiki/File:Binary_damage_code_(28227210988).jpg>) by Markus Spiske (CC0).
- Nord background is a canvas port of [Substrate](https://github.com/xscreensaver/xscreensaver/blob/master/hacks/substrate.c) from xscreensaver, by J. Tarbell ([complexification.net](http://complexification.net)) and Mike Kershaw.
- Nord colours from [Nord](https://www.nordtheme.com) by Arctic Ice Studio.
- Solarized static background by [Chris Ried](https://unsplash.com/photos/ieic5Tq8YMk) on Unsplash.
- Solarized Truchet background is a canvas port of [Truchet](https://github.com/xscreensaver/xscreensaver/blob/master/hacks/truchet.c) from xscreensaver by Adrian Likins.
- Solarized Phosphor background is a canvas port of [Phosphor](https://github.com/xscreensaver/xscreensaver/blob/master/hacks/phosphor.c) from xscreensaver by Jamie Zawinski, with its built-in public domain 6x10 font.
- Theme fonts [Orbitron](https://fonts.google.com/specimen/Orbitron) by Matt McInerney and The League of Moveable Type, [Courier Prime](https://fonts.google.com/specimen/Courier+Prime) by Alan Dague-Greene for Quote-Unquote Apps and [JetBrains Mono](https://www.jetbrains.com/lp/mono/) by JetBrains, all under the SIL Open Font License (licences in `src/fonts/`).
- Classic menu and title bar font is a pixel conversion of [Wine](https://gitlab.winehq.org/wine/wine)'s MS Sans Serif by Huw D M Davies and Dmitry Timoshkov, under the LGPL 2.1 (source, converter and licence in `src/fonts/`).
