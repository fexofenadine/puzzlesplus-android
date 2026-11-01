import { app, h } from 'hyperapp'
import '../app.css'
import s from './Guide.module.css'
import m from '../Menu.module.css'
import Dialog from '../Dialog'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss from '../shell/Boss'
import Taskbar from '../shell/Taskbar'
import PhoneBar from '../shell/PhoneBar'
import { phone } from '../shell/phone'
import ThemeMenu from '../shell/ThemeMenu'
import { listen, shellActions, shellState, shortcut } from '../shell/actions'
import { startBackgrounds } from '../shell/backgrounds'

//a part of the guide: { title, sections: [{ id, title, body }] }, body is a function of nothing
//so examples are only drawn once the page runs

//the hash names a section, which sits in the article's own scroll box
//firefox misses :target on sections drawn after the page loaded, so it is marked here
const showHash = () => {
  const target =
    location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)))
  document.querySelectorAll('[data-current]').forEach((el) => delete el.dataset.current)
  if (!target) return
  target.dataset.current = ''
  target.scrollIntoView()
}

const Contents = ({ parts }) => (
  <nav class={s.contents} aria-label="Contents">
    {parts.map((part) => (
      <div class={s.part}>
        <a class={s.partLink} href={`#${part.sections[0].id}`}>
          {part.title}
        </a>
        <ul class={s.list}>
          {part.sections.map((section) => (
            <li>
              <a class={s.link} href={`#${section.id}`}>
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>
)

const Article = ({ parts }) => (
  <article class={s.article} oncreate={() => setTimeout(showHash)}>
    {parts.map((part) => [
      <h2 class={s.partTitle}>{part.title}</h2>,
      part.sections.map((section) => (
        <section class={s.section} id={section.id}>
          <h3 class={s.title}>{section.title}</h3>
          {section.body()}
        </section>
      )),
    ])}
  </article>
)

//starts a guide page: page names it for the taskbar, home is where closing goes
export const startGuide = ({ page, root = '../../', home = '../', title, icon, parts }) => {
  const state = { ...shellState(page, root), home }
  const actions = {
    ...shellActions,
    init: () => (state, actions) => {
      window.addEventListener('keydown', actions.press)
      window.addEventListener('hashchange', showHash)
      listen(actions)
    },
    //only esc means anything here, the zoom keys belong to the games
    press: (event) => (state, actions) => {
      if (event.keyCode === 27) shortcut(event, state, actions)
    },
    pause: () => null,
    reset: () => null,
  }
  const view = (state, actions) => (
    <main oncreate={actions.init}>
      <div key="a" class={s.page}>
        <Dialog
          hidden={state.windowState !== 'open'}
          title={!phone && title}
          onClose={() => location.assign(home)}
        >
          {!phone && (
            <ul class={m.root} tabindex={-1} onfocusout={actions.toggleMenu}>
              <ThemeMenu state={state} actions={actions} />
            </ul>
          )}
          <div class={s.body}>
            <Contents parts={parts} />
            <Article parts={parts} />
          </div>
        </Dialog>
      </div>
      {phone ? (
        <PhoneBar key="h" title={title} back={home} state={state} actions={actions} />
      ) : (
        <Taskbar key="h" own={{ title, icon }} state={state} actions={actions} />
      )}
      {state.backgroundSettings && (
        <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
      )}
      {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
    </main>
  )
  app(state, actions, view, document.getElementById('app'))
  startBackgrounds()
}

//a worked example: the board, then what the hint would say about it
export const Figure = ({ caption }, children) => (
  <figure class={s.figure}>
    <div class={s.board}>{children}</div>
    {caption && <figcaption class={s.caption}>{caption}</figcaption>}
  </figure>
)

//a link to another page of the site
export const Page = ({ href }, children) => (
  <a class={s.inline} href={href}>
    {children}
  </a>
)
