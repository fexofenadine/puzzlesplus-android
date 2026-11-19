import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { defineConfig } from 'vite'

//?v=<hash> on asset links so old and new files never mix
const versionAssets = () => ({
  name: 'version-assets',
  transformIndexHtml: {
    order: 'post',
    handler: (html, { bundle }) =>
      html.replace(/((?:\.\.\/)+|\.\/)(assets\/[^"?]+)"/g, (match, path, file) => {
        const output = bundle?.[file]
        if (!output) return match
        const hash = createHash('sha256')
          .update(output.code ?? output.source)
          .digest('hex')
          .slice(0, 8)
        return `${path}${file}?v=${hash}"`
      }),
  },
})

//both games share one pre-paint script, inlined so it runs before the page draws
const prepaint = () => ({
  name: 'prepaint',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) =>
      html.replace(
        '<!--prepaint-->',
        `<script>${readFileSync('src/shell/prepaint.js', 'utf8')}</script>`,
      ),
  },
})

//assets.json lists every built file under assets/, for the page to keep offline (shell/offline.js)
const assetList = () => ({
  name: 'asset-list',
  generateBundle(options, bundle) {
    const files = Object.keys(bundle).filter((file) => file.startsWith('assets/'))
    this.emitFile({ type: 'asset', fileName: 'assets.json', source: JSON.stringify(files) })
  },
})

//the website's pages, only the screensaver's for the windows app (vite --mode screensaver), or
//both for the android app, whose live wallpaper is the screensaver's page
const pages = {
  index: 'index.html',
  minesweeper: 'minesweeper/index.html',
  takuzu: 'takuzu/index.html',
  nonograms: 'nonograms/index.html',
  sudoku: 'sudoku/index.html',
  2048: '2048/index.html',
  lightup: 'lightup/index.html',
  futoshiki: 'futoshiki/index.html',
  'minesweeper-guide': 'minesweeper/guide/index.html',
  'takuzu-guide': 'takuzu/guide/index.html',
  'nonograms-guide': 'nonograms/guide/index.html',
  'sudoku-guide': 'sudoku/guide/index.html',
  '2048-guide': '2048/guide/index.html',
  'lightup-guide': 'lightup/guide/index.html',
  'futoshiki-guide': 'futoshiki/guide/index.html',
  'how-to-play': 'how-to-play/index.html',
}

const screensaverPages = {
  show: 'screensaver/index.html',
  settings: 'screensaver/settings.html',
}

//the website stays readable, the android app and the screensaver are minified
export default defineConfig(({ mode }) => ({
  base: './',
  oxc: {
    jsx: { runtime: 'classic', pragma: 'h' },
  },
  css: {
    modules: {
      //readable class names like Cell_root
      generateScopedName: (name, file) => `${basename(file).split('.')[0]}_${name}`,
    },
  },
  //the games' icons and pages stay out of the screensaver
  publicDir: mode === 'screensaver' ? false : 'public',
  build: {
    outDir: mode === 'screensaver' ? 'dist-screensaver' : 'build',
    minify: mode === 'android' || mode === 'screensaver',
    cssMinify: mode === 'android' || mode === 'screensaver',
    modulePreload: { polyfill: false },
    rolldownOptions: {
      //the root page only redirects, each game and guide is its own page
      input:
        mode === 'screensaver'
          ? screensaverPages
          : mode === 'android'
            ? { ...pages, ...screensaverPages }
            : pages,
      output: {
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [prepaint(), versionAssets(), assetList()],
  test: {
    environment: 'jsdom',
  },
}))
