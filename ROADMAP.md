# Roadmap

What is planned for Puzzles Plus, the website and the [Android app](https://github.com/fexofenadine/puzzlesplus-android). The website, the app and the [screensaver](https://github.com/fexofenadine/puzzlesplus-screensaver) are all at 2.1.0 (released 2026-11-22). The next milestone is 2.5.0, sound and music.

## 2.5.0 (planned)

**Theme of the release:** sound and music, mostly music: background music, and music for wins and losses.

Off by default, so the games stay as quiet as they are now until someone turns it on.

### Planned

- [ ] **Background music (BGM)**: looping music while a game is open, one track per theme or a shared playlist, starting after the first press (browsers do not allow sound before one)
- [ ] **Win music** and **loss music** for every game, short and in the theme's style (2048's target tile and Minesweeper's loss included)
- [ ] **Sound settings**: music on or off and its volume, in the Display menu on the web and the options sheet on Android, saved like the other settings. Quiet under the pause cover, the boss key and a hidden tab, and it follows the phone's silent mode on Android
- [ ] The music files are **bundled with the app and the page** and play offline

### To decide

- Where the music comes from. Settled limits below; within them it could be composed by the owner or taken from a source whose licence allows it (CC0, or one that only needs a credit line, which goes into the About box credits and the README)
- A style for each theme (Synthwave, Vaporwave and Matrix suggest themselves), and whether Classic stays silent to match the original
- A size budget for the music files, since the site is meant to stay small and offline (audio compresses well as Opus or MP3)
- Whether the live wallpaper and the screensaver stay silent (suggested: yes)

### Settled

- No AI features, so no generated music
- Nothing streamed or loaded from another site: every file is in the project
- Off by default, and never starts by itself without a press
- No version bump until 2.5.0 is ready

## 2.0.0 (released 2026-11-21)

**Theme of the release:** more to play and more to keep track of: an eighth game, Bridges, the first Sudoku variant, a home page and statistics

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
- [x] README pictures: all retaken with the current look on 2026-11-21, with a Bridges animation and guide added

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

**Desktop and themes**

- [ ] One installable web app for the whole site instead of one per game
- [ ] Translations
- [ ] More themes or backgrounds

**Android**

- [ ] A tablet and landscape layout
- [ ] Haptics on presses, wins and mistakes
- [ ] An F-Droid listing

### Housekeeping

- [x] The website's, the app's and the screensaver's `package.json` versions are kept at parity, and all three went to 2.0.0 at release; later fixes are point releases

## Settled, not planned

Decided already, listed so they are not raised again.

- No AI features of any kind
- Nothing loaded from another site at run time: fonts, shaders and pictures stay bundled
- No daily puzzle or shared links for Minesweeper and 2048
- No larger Sudoku boards (12 × 12, 16 × 16): not at this time, perhaps never
- No redo in 2048, since new tiles are random
- The Android app opens shared links on the website, by choice
- Classic stays faithful to the original Minesweeper; new features there are opt-in
