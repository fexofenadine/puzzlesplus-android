import { h } from 'hyperapp'
import s from './Transfer.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'
import { exportData, readBackup } from './backup'
import { copy } from './share'
import { dayOf } from './daily'

//hands the browser a file to save
const download = (name, text) => {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

//a backup is only restored once the player has seen what it replaces
const offer = (actions, text) => {
  const entries = readBackup(text)
  actions.changeBackup(
    entries
      ? { pending: text, note: `Replace everything kept here with this backup?` }
      : { pending: null, note: 'That is not a Puzzles Plus backup.' },
  )
}

//settings, best times, statistics and saved games out to a file or text, and back in
const Backup = ({ key, state, actions }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleBackup()}>
    <Dialog title="Backup" onClose={actions.toggleBackup}>
      <div class={s.root}>
        <p>
          Everything Puzzles Plus keeps in this browser: settings, best times, statistics and games
          in progress. Save it as a file, or copy it as text to paste into another browser or the
          app.
        </p>
        <div class={s.row}>
          <Button
            type="button"
            onClick={() => {
              download(`puzzlesplus-${dayOf()}.json`, exportData())
              actions.changeBackup({ pending: null, note: 'Saved as a file.' })
            }}
          >
            <span class={s.button}>Save to File</span>
          </Button>
          <Button
            type="button"
            onClick={() => {
              const text = exportData()
              actions.changeBackup({ text, pending: null, note: '' })
              copy(text).then((copied) =>
                actions.changeBackup({
                  note: copied ? 'Copied to the clipboard.' : 'Select the text below and copy it.',
                }),
              )
            }}
          >
            <span class={s.button}>Copy as Text</span>
          </Button>
        </div>
        <textarea
          class={s.field}
          spellcheck={false}
          placeholder="Paste a backup's text here to restore it"
          value={state.text}
          oninput={(event) => actions.changeBackup({ text: event.target.value })}
        />
        <div class={s.row}>
          <Button type="button" onClick={(event) => event.currentTarget.nextSibling.click()}>
            <span class={s.button}>Open File...</span>
          </Button>
          <input
            class={s.file}
            type="file"
            accept=".json,application/json,text/plain"
            onchange={(event) => {
              const [file] = event.target.files
              if (file) file.text().then((text) => offer(actions, text))
              event.target.value = ''
            }}
          />
          <Button
            type="button"
            disabled={!state.text.trim()}
            onClick={() => offer(actions, state.text)}
          >
            <span class={s.button}>Restore from Text</span>
          </Button>
        </div>
        <p class={s.note}>{state.note}</p>
        <div class={s.footer}>
          {state.pending && (
            <Button type="button" onClick={actions.restoreBackup}>
              <span class={s.button}>Restore</span>
            </Button>
          )}
          <Button type="button" onClick={actions.toggleBackup} onCreate={(el) => el.focus()}>
            <span class={s.button}>{state.pending ? 'Cancel' : 'Close'}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default Backup
