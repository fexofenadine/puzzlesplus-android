# Puzzles Plus for Android: handover

Written 2026-11-17, after testing the app on an emulator and reviewing its UI against Android's
conventions, then updated the same day after a second round (the bottom bar, system font size,
pinch zoom, the system long-press time and app links: section 8), released as 1.9.0. It covers
how the project fits together, how to build, test and release it, what was found and changed, and
what is still open. Terms are explained where they first appear, and there's a glossary at the end.

## 1. What the project is

There are two repositories, and the app is mostly the website.

| Repo | Folder | What it is |
| --- | --- | --- |
| `fexofenadine/puzzlesplus` | `projects/puzzlesplus` | The website: eight puzzle games in a Windows 95 style, written in JavaScript with Hyperapp 1 and built with Vite. |
| `fexofenadine/puzzlesplus-android` | `projects/puzzlesplus-android` | A copy of the website repo, plus a thin phone layer and the Android project that packages it. |

GitHub won't fork a repo into the account that owns it, so the Android repo is a plain clone, not a
fork. Its git remotes are `origin` (the Android repo itself) and `upstream` (the website). Game
changes are made on the website first and then merged in (section 6). Changes that only make sense
on a phone are made in the Android repo, in as few files as possible, so those merges stay easy.

## 2. How a web app becomes an Android app

The app is a **hybrid app**: its UI is web pages shown in a browser view inside a native Android
shell. The layers, bottom up:

1. **The web build.** Vite compiles the website's source into plain HTML, CSS and JS. The Android
   build runs Vite in its own *mode* (`--mode android`). Code checks for it with
   `import.meta.env.MODE === 'android'`, exported as `phone` from `src/shell/phone.js`, and the
   output goes to `www/` instead of `build/`.
2. **Capacitor** ([capacitorjs.com](https://capacitorjs.com), version 7) is the shell. It provides
   a ready-made Android project whose single screen is a **WebView**, Android's embeddable Chromium
   browser. `npx cap sync android` copies `www/` into that project's assets. Capacitor also gives
   JavaScript a bridge to native features through **plugins**. The only one used is `@capacitor/app`,
   for the back button and for minimising the app. Its settings live in `capacitor.config.json`.
3. **The Android project** (`android/`) is a normal **Gradle** project. Gradle is Android's build
   tool, playing the part Vite plays for the web. Gradle compiles the Java, packs the web files
   and resources, signs the result and writes an **APK** (Android package, the installable file).
4. **`MainActivity.java`**: an **Activity** is one screen of an Android app, and this app has one.
   Capacitor's `BridgeActivity` does the real work; `MainActivity` extends it with the app's own
   native bits (section 4).

The web files are served to the WebView from `https://localhost/` inside the app, so nothing loads
from the internet. One quirk: Capacitor serves its root `index.html` for any path without a dot.
A link to `takuzu/` would therefore land on the root page, which redirects to the last game, and
could loop. Phone links name the file (`takuzu/index.html`) through `pageUrl()` in `phone.js`.

### Android versions in play

* **minSdk 23** (Android 6): the oldest Android the app installs on.
* **targetSdk 35** (Android 15): the version the app says it was built and tested for. Android
  turns on newer behaviour based on this number. The most important one here: from target 35,
  Android 15 draws every app **edge to edge**, behind the status bar, the navigation bar and the
  on-screen keyboard. The app has to keep its own content clear of them, using **insets** (the
  sizes of whatever system UI covers each edge).
* **compileSdk 35**: the Android library version the Java is compiled against.

These live in `android/variables.gradle`. Google Play raises the target it requires every
August. That doesn't matter for sideloaded APKs (installed from a file rather than a store), but
it would if the app went to the Play Store.

## 3. Repository map: the Android-only parts

Everything else is shared with the website and described in its notes.

| Path | Purpose |
| --- | --- |
| `capacitor.config.json` | App id `io.github.fexofenadine.puzzlesplus`, name, `webDir: www`. `adjustMarginsForEdgeToEdge` is now `disable` because `MainActivity` handles insets itself (section 7.1). |
| `android/app/build.gradle` | Reads the version from `package.json` and turns `1.2.3` into **versionCode** `10203`, the whole number Android compares to decide whether an install is an update. Names APKs `puzzlesplus-<version>.apk` and signs release builds. Debug builds get the id suffix `.debug` and install beside the release app as "Puzzles Plus Debug". |
| `android/app/src/main/AndroidManifest.xml` | The app's declaration to Android: its activity, launcher entry, internet permission (Capacitor's default, unused), `windowSoftInputMode="adjustResize"`, `fontScale` in `configChanges` (8.2) and the app link **intent filter** (8.5). |
| `android/app/src/main/java/.../MainActivity.java` | Native extras: text zoom, font size, system bar colours, insets, haptics, long-press time. |
| `android/app/src/main/res/` | Android resources: launcher icons (`mipmap-*`), splash, colours, styles. The icons are drawn by `src/shell/icon.py --android android/app/src/main/res`. |
| `src/shell/phone.js` | `phone` flag, `pageUrl`, back button handling, system bar colours, `longPress()`, `holdTime()`, the font size variables and incoming links. |
| `src/shell/PhoneBar.jsx`, `PhoneBar.module.css` | The top bar, the bottom bar, the side panel ("drawer") and the options sheet. |
| `src/shell/pinch.js` | Pinch zoom on the board (8.3), started from `src/shell/start.js` on phones. |
| `src/*/PhoneMenu.jsx` | Each game's section of the options sheet (difficulty, size, options). |
| `src/app.css` (the `[data-phone]` blocks) | Phone layout, the material colour tokens `--md-*` per theme, material styling of dialogs. |
| `src/shell/chips/` | The theme picker's round pictures, rendered by `chips/source/chips.py`. |
| `tools/droid.py` | The emulator test driver from this pass (section 5.3). |
| `docs/android/` | README screenshots. |

On a phone, `phone.js` sets `data-phone` on the root element before the first paint, and every
phone style hangs off `:root[data-phone]`. The website's taskbar, Start menu, boss key and title
bar buttons are left out on phones. Each game's `app.jsx` and `Game.jsx` carry a few small
patches (render `PhoneBar`, drop the title and menu bar), and those are the lines that sometimes
conflict when merging.

### Two looks

Classic keeps the Windows 95 look for the phone chrome too: grey panels, bevelled buttons, square
checkboxes. Every other theme uses **Material Design 3** (Google's design system for Android):
a flat top app bar, a navigation drawer, a bottom sheet, switches, filter chips and rounded
dialogs, coloured from each theme's palette through the `--md-*` tokens (`--md-bar`, `--md-panel`,
`--md-primary` and so on, one block per theme in `app.css`). The split is deliberate and holds up:
Classic is a costume, and Material elsewhere is what Android users expect.

## 4. The native layer (`MainActivity.java`)

Native code and the page talk through **JavaScript interfaces**: Java objects the WebView exposes
to the page as globals, whose `@JavascriptInterface` methods the page can call.

* `window.PuzzlesBars.set('#rrggbb')`: `phone.js` sends the theme's bar colour whenever the theme
  changes. Java colours the status and navigation bars, or the window behind them on Android 15
  where bars are transparent, and picks dark or light bar icons by brightness.
* `window.PuzzlesTouch.longPress()`: plays the system's long-press haptic.
* `window.PuzzlesTouch.longPressTimeout()`: the system's long-press time in milliseconds (8.4).
* `window.PuzzlesText.scale(sp)`: how much bigger text of that size shows at the phone's font
  size setting (8.2). An **sp** (scale-independent pixel) is Android's unit for text: a dp that
  also follows the font size setting.
* `setTextZoom(100)`: stops the WebView stretching *all* text by the font size, boards included;
  the page applies the font size itself, to everything but the boards (8.2).
* `onConfigurationChanged` tells the page when the font size changes (a `fontscale` event), so
  it updates without a reload.
* `fitBars`: held sideways, the status and navigation bars hide until a swipe from the edge shows
  them ("immersive mode", normal for games). Upright they show.
* `fitInsets` (new, Android 15+): keeps the WebView clear of the system bars and the keyboard
  (7.1).

`setStatusBarColor` and `setNavigationBarColor` show as deprecated when building. They do nothing
on Android 15, but older versions still need them, so the build note is expected.

## 5. Day to day

### 5.1 Setup on this PC

* Node, with `npx` for the tools. Yarn isn't installed, so `yarn build:android` in the README is
  `npx vite build --mode android --outDir www` here.
* JDK 21 (Temurin) for Gradle: `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot`.
* Android SDK at `%LOCALAPPDATA%\Android\Sdk`: `ANDROID_HOME`. It holds `platform-tools` (adb),
  `emulator`, build tools and the system images. Android Studio is installed and shares it, but
  nothing needs it.

### 5.2 Build, install, run

```powershell
cd C:\Users\panda\projects\puzzlesplus-android
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npx vite build --mode android --outDir www   #web files
npx cap sync android                         #copy them (and capacitor.config.json) into android/
android\gradlew.bat -p android assembleDebug #android/app/build/outputs/apk/debug/puzzlesplus-<v>-debug.apk
adb install -r android\app\build\outputs\apk\debug\puzzlesplus-1.9.0-debug.apk
adb shell am start -n io.github.fexofenadine.puzzlesplus.debug/io.github.fexofenadine.puzzlesplus.MainActivity
```

**adb** (Android Debug Bridge) is the command-line link to a phone or emulator: it installs
apps, runs shell commands on the device (`adb shell ...`), takes screenshots and forwards ports.
`adb devices` lists what's connected. A real phone needs Developer options turned on, with USB
debugging (or wireless debugging) enabled.

Web-only changes need just the first two commands and the Gradle step, since the web files are
packed into the APK. For quick layout work, `npx vite --mode android` serves the phone build in a
desktop browser at phone size, though native parts (back button, bar colours, haptics,
keyboard) only work in the app.

### 5.3 The emulator and remote debugging

* The emulator is an **AVD** (Android Virtual Device) named `puzzles`: a Pixel 6 with Android 15.
  Run it with a window: `& "$env:ANDROID_HOME\emulator\emulator.exe" -avd puzzles`, or without one
  by adding `-no-window -no-audio`. This session it crashed under `-gpu swiftshader_indirect` as
  soon as the app ran its shader background, and ran fine with `-gpu host`.
* **Remote debugging**: debug builds let a desktop browser's developer tools attach to the app's
  WebView. With the phone or emulator connected, open `edge://inspect/#devices` in Edge. The app's
  page appears there with an *inspect* link: full DevTools, console, element picker and all.
  Release builds don't allow this.
* `tools/droid.py` drives the app from Python for repeatable checks. It sends real touches through
  adb and reads the page through the **Chrome DevTools Protocol** (CDP, the wire protocol DevTools
  itself uses). `py -3 tools/droid.py` tours every game, the drawer, the options sheet and the
  sideways layout, and saves screenshots to `tools/droid-shots/` (ignored by git). Import it for
  your own checks:

  ```python
  from droid import *
  start(); pg = Page()
  pg = goto(pg, 'sudoku/index.html', {'theme': 'synthwave'})
  pg.hit('button[title=Options]')        #a real tap where the button shows
  shot('sheet')
  pg.hit('main button[class*=Cell_]', 10, hold=1000)   #long press a cell
  print(pg.ev('document.title'), pg.logs)              #run js, see page errors
  ```

  `where()` and `hit()` find an element by hit testing rather than `getBoundingClientRect`,
  because the emulator's WebView 124 reports rects of CSS-zoomed elements without the zoom, and the
  boards and dialogs are zoomed. (Real phones update their WebView through the Play Store and are
  usually newer, where Chrome 128 fixed this.)
* Useful emulator tricks: `adb shell wm size 1600x2560` with `adb shell wm density 320` turns the
  phone into a tablet (`wm size reset` and `wm density reset` undo it).
  `adb shell settings put secure show_ime_with_hard_keyboard 1` makes the on-screen keyboard
  appear even though the emulator counts your PC keyboard as attached.
  `adb shell dumpsys vibrator_manager` lists recent haptic effects, since an emulator can't buzz.
  `adb shell settings put system font_scale 1.3` sets the font size (1.0 is normal, 2.0 the
  largest on Android 14+). `adb shell wm size 945x2100` makes a 360-point-wide phone, the narrowest
  common size.
* Two fingers: adb's `input` command only has one finger, so `droid.py`'s `pg.touch()` and
  `pg.pinch(a, b, a2, b2)` send touches through CDP instead (page pixels, real touch events).
* Links: `adb shell am start -a android.intent.action.VIEW -d '"https://fexofenadine.github.io/puzzlesplus/takuzu/"' io.github.fexofenadine.puzzlesplus.debug`
  opens a link in the app, and `adb shell pm get-app-links <package>` shows whether Android has
  verified the domain.

### 5.4 Tests and lint

`npx vitest run` (327 tests, about 25 s) and `npx eslint .` / `npx prettier --check src`, from
PowerShell rather than Git Bash (under Git Bash every test file fails over the drive letter's
case). Stop any running Vite dev server first. A few tests deal puzzles against a time budget and
now and then fail on a busy machine, then pass on the next run. The unit tests cover the shared
game logic. The phone layer has no automated tests, which is why the emulator checks exist.

## 6. Bringing in website changes

```powershell
git fetch upstream
git merge upstream/master
```

`README.md` conflicts on every website README change: keep the app's (`git checkout --ours
README.md`) and copy any wanted wording by hand. Other conflicts come from the phone patches
in each game's `app.jsx`/`Game.jsx`, the root `index.html` redirect (`<game>/index.html` here,
`<game>/` on the website) and occasionally the end of `app.css`. A new game needs a `PhoneMenu.jsx`,
the same patches as the other games, and its name in the README and root `index.html` before it
works on a phone.

## 7. What this pass found and changed

Tested on the emulator (Android 15, 412×842 points): every game on Nord, Synthwave and Classic;
the drawer and options sheet; every dialog type; the keyboard upright and sideways; long press
flags; winning and entering a best-time name; guides and back navigation; the sideways layout;
a tablet-sized screen upright and sideways. No page errors were logged anywhere. Changes, most
important first:

### 7.1 The keyboard covered dialogs (bug)

On Android 15 the keyboard slid over the page without the page shrinking: the best-time name
box's OK was hidden upright, and held sideways the whole box was. This is the edge-to-edge change
above: Android stopped resizing apps for the keyboard, and Capacitor's built-in inset handling
only covers the system bars. `MainActivity.fitInsets` now gives the WebView a bottom margin of the
larger of the navigation bar and the keyboard, so the page shrinks to the space left and the
dialogs re-centre above the keyboard. Older Androids get the classic behaviour from
`windowSoftInputMode="adjustResize"` in the manifest. Sideways only about 150 points are left
above the keyboard, so the name box scrolls, with the field kept in view.

### 7.2 A dialog button ran off the screen (bug)

The "A game is in progress" prompt had Save, Discard and Cancel in a row too wide for its box,
and Save hung off the dialog's left edge. Dialog footers now wrap when they don't fit, and the
prompt is a little wider, so all three fit on one row.

### 7.3 Dialog actions in Android's order

Windows puts the main action first (OK, Cancel); Material puts it last, at the right (Cancel, OK),
and Android users reach for the right. Material dialogs on the phone now lay their footer out
backwards: Cancel · Discard · **Save**, No · **Yes**, Defaults · Cancel · **OK**. The filled
button is still the main action. Best times already ended with OK and stay as they were; the
custom field's OK/Cancel stay stacked beside the fields. Classic is untouched.

### 7.4 Haptics on hold to flag

Android gives a short buzz when a long press does something. The WebView already buzzed on any
long press, but at the system's long-press time (about 400 to 500 ms), before Minesweeper flags at
600 ms, and even on holds released too early to flag. The WebView's own buzz is now off, and
Minesweeper asks for the system long-press haptic as the flag goes down (`longPress()` in
`phone.js`, called from the touch handler in `src/app.jsx`). It follows the phone's
"touch feedback" setting and needs no permission, unlike the web's `navigator.vibrate`. Verified
on the emulator: one buzz per flag, none for a short hold.

### 7.5 The hint button's icon

A question mark in a circle is Android's icon for help, so people would expect a help page.
The top bar's hint button is now a lightbulb, the usual icon for hints. The in-board `?` buttons
belong to the games' own look and are unchanged.

### 7.6 The options sheet and side panel

* **Drag to dismiss**: the sheet has a drag handle (the small bar at its top), which on Android
  says "pull me". It wasn't draggable before. Now the sheet follows a finger down from its top
  and closes when pulled a quarter of the way (at most 120 points), springing back otherwise. A
  drag that starts while the list is scrolled down scrolls it as before. The side panel closes on
  a leftward swipe the same way. Both still close by tapping the shade or pressing back.
* **Width**: Material bottom sheets stop at 640 points wide. On a tablet, or a phone held
  sideways, the sheet stretched across the whole screen; it now sits centred at 640.
* `overscroll-behavior: contain` stops a scroll that reaches the end of the sheet or panel from
  carrying on into the page behind.

### 7.7 Theme picker

Nine themes in four columns left Coral alone on a third row. It's now five and four, or three
rows of three on a narrow phone (under 380 points wide).

### 7.8 Touch target sizes

Android's guideline is 48 dp for anything tappable. A **dp** (density-independent pixel) is
Android's unit, 1/160 inch, the same as a CSS pixel in the WebView. The custom field's three text
boxes were about 21 dp tall even after the phone's dialog zoom, and the background settings'
rows about 28. Text fields in phone dialogs are now taller with more padding, and the background
settings rows and checkboxes larger, with narrower value columns so the dialog keeps more of its
zoom. The game boards themselves now have pinch zoom (8.3).

### 7.9 Screen reader labels

TalkBack (Android's screen reader) reads a button's accessible name. The bar buttons only had
`title`, which it treats as a fallback; they now carry `aria-label` too. Their icons are marked
`aria-hidden`, the side panel is a labelled `nav` and the sheet a labelled `dialog`. This was
checked in the page, not with TalkBack itself, which the emulator image lacks.

### 7.10 Themed icon

Android 13 and later can show every home-screen icon in one colour matched to the wallpaper
("themed icons"). Apps that give no one-colour version keep their full-colour icon, which stands
out among themed ones. `icon.py` now also draws `ic_launcher_monochrome.png` (the piece with the
plus cut out), and both adaptive icon files list it. An **adaptive icon** is Android 8's layered
icon format: a background and a foreground that the launcher masks to its own shape, plus this
optional monochrome layer.

### Files touched

`MainActivity.java`, `AndroidManifest.xml`, `capacitor.config.json`, both
`mipmap-anydpi-v26/ic_launcher*.xml`, five new `ic_launcher_monochrome.png`, `src/shell/icon.py`,
`src/shell/phone.js`, `src/app.jsx` (one call), `src/shell/PhoneBar.jsx`,
`src/shell/PhoneBar.module.css`, `src/app.css`, `.gitignore`, and the new `tools/droid.py` and this
file.

## 8. Second round: what you picked

The first version of this handover ended with recommendations. You asked for all of them, with
the bottom bar for the top bar problem ("if it looks shit I will switch to the overflow menu").
Everything below was tested on the emulator at font sizes 1.0, 1.3 and 2.0, at 412 and 360 points
wide, upright and sideways, on Nord, Synthwave and Classic. It shipped as 1.9.0.

### 8.1 A bottom bar for the game's actions

The top bar had the menu plus five actions, where Material suggests three at most, and a 360-point
phone cut the game's name to "Minesw…". Upright, the top bar now keeps **menu, title and options**,
and **new game, hint, best times and pause** sit in a **bottom app bar**, Material's bar for a
screen's main actions, where a thumb reaches them. The four spread evenly but never more than
120 points apart, so a tablet doesn't scatter them. Sideways nothing changed: all six stand down
the two side rails.

How it's built, so you can change it: the buttons are still the same two groups in one `<header>`
(that's what the sideways rails need). Upright, the four actions get `position: fixed` along the
bottom (`.act` and `--place` in `PhoneBar.module.css`), and `.split::after` paints the bar behind
them. On game pages the bar's height becomes `--taskbar`, the variable the website uses for its
taskbar's room, so the board's fit, the dialogs and Vaporwave's tape overlay all keep clear of it
with no extra code. Dialogs open between the two bars.

If it doesn't work for you, the fallback we discussed is an overflow (⋮) menu: keep new game,
hint and pause in the top bar and move best times and options into the ⋮ menu. The game's name
also shrinks to three quarters before it is cut short (`fitTitle`).

### 8.2 The phone's font size

`setTextZoom(100)` stays, because letting the WebView scale every text would also blow up the
digits inside the board's fixed-size cells. Instead `MainActivity` tells the page how big the
phone's text is through `PuzzlesText.scale(sp)`, and `phone.js` turns that into two CSS variables
on the root element: `--font-scale` (for 14 sp body text) and `--title-scale` (22 sp titles).
They differ because Android 14 and later scale big text less than small text ("non-linear font
scaling"): at the largest setting 14 sp text grows 1.86× and 22 sp titles 1.59×.

What follows it:

* the top bar's title, the side panel, the options sheet (every label, row, chip and switch), the
  theme names and the Fit chip: each `font-size` is multiplied by the variable in CSS;
* the guides' text, headings and contents list (their example boards keep their size);
* dialogs: their zoom is multiplied by `--font-scale`. A dialog already as wide as the screen can't
  simply zoom further, so it first wraps its text into a narrower column, as far as its widest
  unbreakable part (a table, a field, a long link) allows (`fitDialog` in `Overlay.jsx`). At normal
  size dialogs look exactly as before.

What adjusts to fit: the top bar grows taller once the title needs it, rows and headers grew from
fixed heights to minimum heights, the value column of the window slider grows, and the theme
picker drops to three columns once text is 15% or more above normal (`data-big-text`, set by
`phone.js`, since CSS can't compare a variable with a number). Changing the font size in Settings
while the app is open updates it straight away, with no reload.

What stays: the boards, their scoreboards and number pads, and the icons. Android scales text,
not icons, and the boards have pinch zoom (8.3).

### 8.3 Pinch zoom

Two fingers on the board zoom it (up to about five times the size of a cell at the fit, and
always at least half as big again) and move it around; one finger always plays. Zoomed in, a
**Fit** chip in the bottom corner snaps it back, and a new game, a resumed game, a board of
another size or turning the phone also return to the fit. Everything is in `src/shell/pinch.js`.

The zoom is a CSS `transform` on the game window's unzoomed wrapper, on top of the zoom the board
already has from fitting the screen. A transform changes only how the board is drawn, not the
layout, so fitting and the games' own hit testing (`elementFromPoint`) carry on untouched.

The hard part was telling a pinch from play, because most games act the moment a finger lands
(Takuzu, Sudoku, Light Up, Futoshiki toggle a cell; Nonograms starts a stroke; 2048 starts a
swipe):

* A single finger's press is held back for up to **100 ms**, or until it moves 8 points, in case a
  second finger follows. Fingers in a pinch usually land well within that, and the delay is too
  short to feel. If no second finger comes, the press is replayed to the game unchanged.
* If a second finger lands in time, the first press never reaches the game. If it lands later, the
  first press is called off: 2048's swipe springs back, Minesweeper's hold is cancelled, and a
  Nonograms stroke is undone. That last one meant a small change in Android's copy of
  `nonograms/app.jsx` (a `drop` action for a cancelled stroke, which used to keep what it had
  painted). A Takuzu or Sudoku cell already tapped stays tapped; the undo button fixes it.
* While two fingers are down, all their events are kept from the game and the page doesn't scroll.

All of this listens on `window` in the **capture phase** (before any game code sees the event),
so the games themselves didn't change, apart from the Nonograms line above.

### 8.4 The system's long-press time

Minesweeper's hold to flag waited 600 ms. On the phone it now uses Android's own long-press
time (`PuzzlesTouch.longPressTimeout()`, 400 ms by default), which people can lengthen under
Settings → Accessibility → Touch & hold delay. The website keeps 600 ms (`holdTime()` in
`phone.js`). It's the only hold in the games.

### 8.5 Links open in the app

"Copy link" shares `https://fexofenadine.github.io/puzzlesplus/...` addresses. Tapping one on a
phone with the app now opens it in the app, at the same page: a `#play=` link loads that board, a
guide link opens the guide at its section.

How **Android App Links** work: the manifest's intent filter claims the address
`https://fexofenadine.github.io/puzzlesplus...` with `autoVerify="true"`. When the app is
installed, Android fetches `https://fexofenadine.github.io/.well-known/assetlinks.json` and checks
that it names this app's package and the fingerprint (SHA-256 hash) of the key the app was signed
with. Only then do links open in the app without asking. That file has to be at the root of the
domain, which is your `fexofenadine/fexofenadine.github.io` repo, not puzzlesplus. It's there now,
with a `.nojekyll` file, because GitHub Pages' default processor (Jekyll) leaves out folders whose
names start with a dot. It lists the release key and the debug key, so debug builds open links too.
The emulator showed the domain as verified.

In the page, `phone.js` handles both cases: a link that arrives while the app runs (Capacitor's
`appUrlOpen` event) and a link that starts the app (`App.getLaunchUrl()`). The second needs care:
Android keeps reporting the starting link for the whole run, so `phone.js` remembers it in
`sessionStorage` and follows it only once.

Worth knowing: people who'd rather links opened in the browser can switch it off under Settings
→ Apps → Puzzles Plus → Open by default. If the release key ever changed, `assetlinks.json` would
need the new fingerprint (`keytool -list -v -keystore <file>` prints it).

## 9. Still open

### 9.1 Back at the top level minimises

Pressing back on a game, with nothing open, sends the app to the background rather than closing
it. That matches what Android 12+ does for an app's root screen, so it's right. **Predictive
back** (Android 14+'s preview animation as you swipe back) isn't turned on. It needs
`android:enableOnBackInvokedCallback="true"` and more testing with Capacitor's back handling, and
gains little in a single-screen app.

### 9.2 Smaller things

* The name box after a win is the older Winner layout (text, field, OK) inside a material frame,
  with the field drawn inside a second outline. It works; a material title ("New best time") and
  a single outlined field would match the other dialogs.
* The status bar stays the bar's colour while the shade darkens the page under the side panel or
  sheet. Material apps usually darken it too.
* Guides still describe mouse controls first ("Right click a square…"), with the touch controls in
  the same paragraph. Fine, but phone-first wording would read better in the app.
* `allowBackup` is on, so Android's automatic backup to Google Drive includes the WebView's
  storage: settings and best times survive a phone change. That's a good default to keep.

### 9.3 Not tested

* A real phone: everything here ran on the emulator, which has no haptics hardware, no TalkBack
  and an old WebView (124).
* Android versions before 15. The keyboard path there relies on `adjustResize`, the long-standing
  behaviour, but it hasn't been run.
* Foldables and split-screen.

## 10. Releasing

1. Bump `"version"` in `package.json` (1.9.0 is the latest release).
2. Build the web files, `npx cap sync android`, then `android\gradlew.bat -p android assembleRelease`.
3. The APK is `android/app/build/outputs/apk/release/puzzlesplus-<version>.apk`, signed with the
   **release key** in `%USERPROFILE%\.android\puzzlesplus-release.jks`, whose passwords are in
   `puzzlesplus-release.properties` beside it. Android only installs an update signed with the
   same key as the installed app, so **back these two files up**: losing them means nobody can
   update, only uninstall and reinstall (losing their best times). Debug builds use a different
   key and package name, so they install alongside the release.
4. Note the APK's SHA-256 (`Get-FileHash <apk>`), commit, push, then
   `gh release create v<version> <apk> -R fexofenadine/puzzlesplus-android --target master --title "Puzzles Plus <version>" --notes "...SHA-256: ..."`.

## 11. Glossary

| Term | Meaning |
| --- | --- |
| Activity | One screen of an Android app; this app has one, `MainActivity`. |
| adb | Android Debug Bridge, the command-line link to a device or emulator. |
| Adaptive icon | Android 8+'s layered launcher icon, masked to each launcher's shape. |
| App Links | Web addresses an app claims, verified by an `assetlinks.json` file on the site, so they open in the app. |
| assetlinks.json | The file at `/.well-known/` on a domain naming the apps (package and signing key fingerprint) allowed to open its links. |
| Bottom app bar | Material's bar along the bottom of a screen for its main actions. |
| APK | Android package, the installable app file. (Play Store uploads use AAB, a bundle Google turns into APKs.) |
| AVD | Android Virtual Device, an emulator profile. |
| Capture phase | The first half of an event's trip: from `window` down to the element, before any handler on the element runs. |
| Capacitor | The framework wrapping the web build in a native Android app, with a JS-to-native bridge. |
| CDP | Chrome DevTools Protocol, how DevTools and `tools/droid.py` talk to the WebView. |
| dp | Density-independent pixel, 1/160 inch; equals a CSS pixel in the WebView. |
| Edge to edge | The app draws under the system bars (and keyboard) and must inset its own content. |
| Gradle | Android's build tool; `gradlew.bat` is a wrapper that fetches the right version. |
| Haptics | Short vibrations as touch feedback. |
| IME | Input method editor: the on-screen keyboard. |
| Intent filter | A manifest entry saying which kinds of request (here, which web addresses) an activity can handle. |
| Insets | The sizes of system UI (bars, cutouts, keyboard) covering each edge of the window. |
| JavascriptInterface | A Java object exposed to the page as a global, the app's own native bridge. |
| Material Design 3 | Google's design system for Android: components, colours, spacing, motion. |
| minSdk / targetSdk / compileSdk | Oldest Android supported / Android version whose behaviour the app opts into / library version compiled against. |
| Non-linear font scaling | Android 14+ grows large text less than small text at big font sizes. |
| Sideloading | Installing an APK from a file rather than a store. |
| sp | Scale-independent pixel: a dp that also follows the font size setting; Android's unit for text. |
| TalkBack | Android's screen reader. |
| versionCode / versionName | The number Android compares for updates / the version shown to people. |
| WebView | Android's embeddable Chromium browser, updated through the Play Store. |
