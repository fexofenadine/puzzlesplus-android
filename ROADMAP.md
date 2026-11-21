# Roadmap

What is planned for Puzzles Plus, the website and the [Android app](https://github.com/fexofenadine/puzzlesplus-android). The app is at 1.12.x; 2.0.0 is the next milestone for the website, the app and the [screensaver](https://github.com/fexofenadine/puzzlesplus-screensaver).

## 2.0.0

**Theme of the release:** _to be decided_

### Planned

- [x] A home page that lists every game, in place of the redirect to the last one played: a window of game cards with Continue for the game played last
- [x] Jigsaw Sudoku: the first Sudoku variant, nine irregular regions in place of the boxes, on the 9 × 9 board only. Other variants wait to see what it costs
- [x] Remove Terafox Coral, keeping Terafox Hex Trail under that full name
- [x] Statistics for every game: wins, losses (when tracked), streaks, and average times overall and by board
- ~~A calendar of past daily puzzles to go back and play~~ _won't do_
- [x] Bridges (Hashi), an eighth game: 7 × 7, 10 × 10 and 14 × 14 in four levels, hints, guide, daily and shared links
- ~~Accessibility: colour-blind friendly palettes, a high contrast option and screen reader labels for boards and cells~~ _postponed, out of scope for 2.0.0_

### To review

Things that shipped on a first reading and still want a second look.

- [x] Vaporwave's Qix background: kept for now, options on offer if it changes
- [ ] README pictures: check the rest still match after the 1.8 theme work (Classic's was retaken)

### Ideas

Suggestions, none of them agreed. An idea moves up to Planned once it is picked.

**Games**

- [ ] Another new game: Slitherlink, Kakuro, Hitori or Tents
- [ ] More Sudoku variants on the 9 × 9 board, now that Jigsaw is in: X (diagonals) and Killer (cages)
- [ ] Nonograms in colour, and more pictures for the art pool
- [ ] Keyboard play for Minesweeper, as the other games have

**Across every game**

- [ ] A game number to type in, beside Copy Link
- [ ] Guided lessons: a guide example that can be played through step by step
- [ ] Printable puzzles
- [ ] Sounds, off by default, bundled with the page

**Desktop and themes**

- [ ] One installable web app for the whole site instead of one per game
- [ ] Translations
- [ ] More themes or backgrounds

**Android**

- [ ] A tablet and landscape layout
- [ ] Haptics on presses, wins and mistakes
- [ ] An F-Droid listing

### Housekeeping

- [x] The website's and the screensaver's `package.json` now match the Android app's version (1.12.0). No version bumps and no new Android apk or screensaver `.scr` builds until 2.0.0 is ready; at release all three bump to 2.0.0, and later fixes are point releases

## Settled, not planned

Decided already, listed so they are not raised again.

- No AI features of any kind
- Nothing loaded from another site at run time: fonts, shaders and pictures stay bundled
- No daily puzzle or shared links for Minesweeper and 2048
- No larger Sudoku boards (12 × 12, 16 × 16): not at this time, perhaps never
- No redo in 2048, since new tiles are random
- The Android app opens shared links on the website, by choice
- Classic stays faithful to the original Minesweeper; new features there are opt-in
