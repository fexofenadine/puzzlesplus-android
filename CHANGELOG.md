# Changelog

What changed in each release of Puzzles Plus. The website, the [Android app](https://github.com/fexofenadine/puzzlesplus-android) and the [screensaver](https://github.com/fexofenadine/puzzlesplus-screensaver) share a version number, and each release's files and notes are on its repository's Releases page.

Every version has its release date under it, as DD/MM/YYYY (Sydney time). Newest first. Version 1.0.1 was tagged but never released.

## Unreleased

A version's date is added when it ships.

- Bridges has **Count Down Numbers** (Game menu, on at first), as Light Up has: an island shows the bridges it still needs, dims at 0 and turns red below it
- Light Up's and Bridges' red for a number with too many bulbs or bridges is each theme's own red
- Every theme can show **any background** (Display, Background, and in the screensaver's settings): its own stays the default, each theme remembers its pick
- A new background, **Pastel Clouds**: Classic's Drift Clouds in Vaporwave's pastels, keeping Vaporwave's tape counter running
- Synthwave's shader wins its sharpness back once the page has settled: a slow start up no longer leaves it at its smallest size for the rest of the visit
- The Android live wallpaper no longer drifts with the home screens at first. It is the **Drift with the home screens** switch in the wallpaper's settings, and a copy that already has it on keeps it until it is switched off
- The live wallpaper runs at **30 fps** at first (it was 60), and can also be set to 15 or 20 fps to save more battery
- The live wallpaper slows to 15 fps while the phone's battery saver is on (**Slow down in battery saver**, on at first)
- Android: the backgrounds can be the phone's **screen saver** (Settings, Display, Screen saver), sharing the live wallpaper's settings
- Android: **Live wallpaper** and **Screen saver** are near the top of the side panel, and the options sheet has **Set as wallpaper**
- A shared link that is far too long for its board is turned away at once instead of freezing the page
- A shared Nonograms link with a picture that has many answers no longer freezes the page while it is checked

## 2.1.0

22/11/2026

Themes at the top of the Display menu, a new order for the games, and a clearer Synthwave picture.

### Added

- The About boxes show the version, the release date and a link to this changelog

### Changed

- The themes are at the top of the Display menu, in alphabetical order, each with a small picture beside it. The Android theme picker is alphabetical too
- Synthwave's picture is a glowing neon sun over a grid on black, easier to pick out at a glance
- The games are listed in a new order everywhere (taskbar, menus, Open Games, the home page, the guides and the README): Minesweeper, Takuzu, Sudoku, Futoshiki, Nonograms, Light Up, Bridges, 2048
- The Android debug app no longer claims the website's links, so the site can be tested from a phone (the release app still opens them)

## 2.0.0

21/11/2026

An eighth game, the first Sudoku variant, a home page and statistics.

### Added

- **Bridges** (Hashi), the eighth game: join the islands with one or two straight bridges that never cross. 7 × 7, 10 × 10 and 14 × 14 in four levels, hints that explain themselves, a guide, a daily puzzle, shared links and best times
- **Jigsaw Sudoku**, the first Sudoku variant: nine irregular regions in place of the boxes on the 9 × 9 board, with its own best times and a Variants section in the guide
- **A home page** listing every game with its guide, and Continue for the game played last
- **Statistics** in every game's Best Times: wins, streaks and the average time, overall and by board
- A **Frame rate** setting (10 to 30) for Synthwave's neon shader and Classic's clouds

### Changed

- Vaporwave's Qix has two shapes by default (0 to 5), each its own colour from the wallpaper, calmer and slower
- The neon shaders are sharper: the small picture is stretched with a smooth cubic filter, frames slow down before the picture shrinks, and the shader costs a little less to draw
- Vaporwave's wallpaper is drawn at 4K
- Synthwave is the default theme

### Removed

- Terafox Coral, the weakest theme. A saved Terafox Coral opens as Terafox Hex Trail

## 1.12.0

19/11/2026

The Android live wallpaper and the screensaver's pages, smoother scanlines that come out even at any screen scale, a rolling band and flicker that no longer redraw the whole screen each frame.

## 1.11.1

19/11/2026

Windows and dialogs move by their title bars on the website. The screensaver keeps the retro themes' scanlines, band, vignette and tape text, and any fireworks.

## 1.11.0

19/11/2026

One screen look: on Synthwave, Vaporwave and Matrix the scanlines, vignette and tracking band lie over the whole screen as one, with the board and its buttons kept clear. The Display menu replaces View and Theme on the website.

## 1.10.0

19/11/2026

Glitches: switch each screen effect on or off, from the ones that come now and then to the scanlines, grain and flicker that stay. Matrix gets torn bands and garbled columns.

## 1.9.1

18/11/2026

A Motion option (Full, Reduced or System) so fireworks and animations play on phones that report reduced motion by mistake.

## 1.9.0

17/11/2026

A bar of game actions along the bottom of the Android app, text that follows the phone's font size, pinch zoom on boards, and app links to the website.

## 1.8.3

17/11/2026

Vaporwave plays like a worn tape: a pastel wallpaper under Qix's lines with colour bleed, static and a running tape counter. Synthwave's background tears, jumps and bursts into static.

## 1.8.2

17/11/2026

Animated background is a switch in the options, a shader that was too slow tries again when switched back on, and Qix draws a little lighter.

## 1.8.1

17/11/2026

Drift Clouds behind Classic in place of the hill, Synthwave's Neon Triangulator on by default, a screensaver button on the pause cover, and fireworks that last until the next game.

## 1.8.0

16/11/2026

Terafox themes over Hex Trail and Coral in place of Everforest, Qix behind Vaporwave, an optional Neon Triangulator shader for Synthwave, and Light Up numbers that count down.

## 1.7.0

16/11/2026

Futoshiki, the seventh game: a latin square with greater and less than signs, four levels on four sizes, notes, hints, a guide, a daily puzzle and links.

## 1.6.0

15/11/2026

Light Up, the sixth game: bulbs that light every cell, four levels on three sizes, hints, a guide, a daily puzzle and links.

## 1.5.1

15/11/2026

Daily results to copy from Best times, dated best times, and keyboard play for Takuzu and Nonograms.

## 1.5.0

15/11/2026

Vaporwave and Everforest themes over new Pipes and Coral backgrounds, and a four to a row theme picker.

## 1.4.2

15/11/2026

A held key acts once, a paused Nonograms stroke is dropped, and 2048's clock skips the time a lost game sat.

## 1.4.1

13/11/2026

Sideways play hides the system bars on Android, settings that deal a new board ask first, and Classic Minesweeper keeps the original's quiet win.

## 1.4.0

11/11/2026

Daily puzzles, Copy Link, Backup, and redo in Takuzu, Nonograms and Sudoku, with Sudoku on 4 × 4 and 6 × 6 as well.

## 1.3.0

10/11/2026

Fireworks over the game window on a phone, a best times button in every game, 2048 keeps its best five scores per size, and win and streak counts in Best Times.

## 1.2.1

10/11/2026

Fireworks keep launching until your next press or key.

## 1.2.0

10/11/2026

Nonograms pixel art (Procedural, Symmetric, Choose Picture, an Art best times tab) and fireworks in each theme's colours on a win.

## 1.1.1

09/11/2026

Fixes from playing 1.1.0: 2048 tiles pop in place and a shorter swipe moves them, and best times are banded and easier to read.

## 1.1.0

09/11/2026

The app's menus and dialogs redrawn in Material Design in each theme's own colours and fonts, saved games to resume later, and window opacity.

## 1.0.9

08/11/2026

The app opens on the game you played last.

## 1.0.8

08/11/2026

2048 looks and moves more like the original: smoother tiles, the original's rounded look and glow, new palettes.

## 1.0.7

08/11/2026

2048's tiles slide, grow and pop as in the original and follow your finger when dragged.

## 1.0.6

08/11/2026

Sudoku and 2048 added, and Resume and a Timer option for every game.

## 1.0.5

02/11/2026

Winning a Minesweeper game flags every mine still covered and sets the counter to 0, as Windows Minesweeper did.

## 1.0.4

02/11/2026

The phone's status and navigation bars take each theme's colour, and best times past 999 seconds show as they are.

## 1.0.3

02/11/2026

A new Nord-coloured icon, centred in round launcher icons, with a matching splash screen.

## 1.0.2

01/11/2026

The icon is centred, and on Beginner the mine and time counters no longer wrap onto two lines.

## 1.0.0

01/11/2026

The first release: Minesweeper, Takuzu and Nonograms on one Windows 95 style desktop with hints that explain their reasoning, guides, six themes and an Android app that works offline.
