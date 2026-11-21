import { cellName, degreesOf, islandCells, islandName, linksOf, plural, solved } from './rules'
import { closedGroups, copyState, settle, startState } from './solver'

//the solving techniques people use, easiest first; a board's level is the hardest it needs
//a state holds the fewest (lo) and most (hi) bridges each link can still take
//each gives steps { technique, level, change: [[link, lo, hi]], sources, text }, change being the
//new bounds of the links it settles; text is only worked out when asked for

export const levels = ['easy', 'medium', 'hard', 'expert']

const step = (technique, level, change, sources, say) => ({
  technique,
  level,
  change,
  sources,
  get text() {
    return say()
  },
})

const bridges = (count) => plural(count, 'bridge')

//the island at the other end of a link
const otherEnd = (link, i) => (link.a === i ? link.b : link.a)

//each island with its links and what they hold so far
const readIslands = (islands, n, { lo, hi }) => {
  const { at } = linksOf(islands, n)
  return islandCells(islands).map((i) => {
    const list = at.get(i) || []
    return {
      i,
      list,
      sumLo: list.reduce((s, l) => s + lo[l], 0),
      sumHi: list.reduce((s, l) => s + hi[l], 0),
    }
  })
}

//need: an island's neighbours can't give it all its bridges between them, so some must go here
export const need = (islands, n, state) => {
  const { links } = linksOf(islands, n)
  const { lo, hi } = state
  const steps = []
  for (const { i, list, sumHi } of readIslands(islands, n, state)) {
    const change = []
    let target = -1
    let least = 0
    let others = 0
    for (const l of list) {
      const forced = islands[i] - (sumHi - hi[l])
      if (forced > lo[l]) {
        change.push([l, forced, hi[l]])
        if (forced > least) {
          least = forced
          target = otherEnd(links[l], i)
          others = sumHi - hi[l]
        }
      }
    }
    if (!change.length) continue
    const total = sumHi
    steps.push(
      step('need', 0, change, [i], () =>
        change.length === 1
          ? `${cap(islandName(islands, n, i))} needs ${bridges(islands[i])}, and ${others ? `its other neighbours can take ${others} at most between them` : 'it has no other neighbour'}, so at least ${bridges(least)} must go to ${islandName(islands, n, target)}.`
          : `${cap(islandName(islands, n, i))} needs ${bridges(islands[i])}, and its neighbours can take only ${total} between them, so each of the links shown must hold at least the bridges drawn.`,
      ),
    )
  }
  return steps
}

//full: an island with all its bridges takes no more
export const full = (islands, n, state) => {
  const { hi } = state
  const steps = []
  for (const { i, list, sumLo } of readIslands(islands, n, state)) {
    if (sumLo !== islands[i]) continue
    const change = list.filter((l) => hi[l] > state.lo[l]).map((l) => [l, state.lo[l], state.lo[l]])
    if (!change.length) continue
    steps.push(
      step(
        'full',
        0,
        change,
        [i],
        () => `${cap(islandName(islands, n, i))} has all its bridges, so no more can reach it.`,
      ),
    )
  }
  return steps
}

//crossed: a link with a bridge across it has none of its own
export const crossed = (islands, n, state) => {
  const { links, over } = linksOf(islands, n)
  const { lo, hi } = state
  const steps = []
  links.forEach((link, l) => {
    if (hi[l] === 0) return
    const across = over[l].find((o) => lo[o] > 0)
    if (across === undefined) return
    steps.push(
      step(
        'crossed',
        0,
        [[l, 0, 0]],
        [links[across].a, links[across].b],
        () => 'A bridge here would cross the bridge already placed, so there is none.',
      ),
    )
  })
  return steps
}

//limit: an island can take only so many more bridges, which caps what each link may hold
export const limit = (islands, n, state) => {
  const { lo, hi } = state
  const steps = []
  for (const { i, list, sumLo } of readIslands(islands, n, state)) {
    const change = []
    let most = 2
    for (const l of list) {
      const room = islands[i] - (sumLo - lo[l])
      if (room < hi[l]) {
        change.push([l, lo[l], Math.max(room, lo[l])])
        most = Math.min(most, room)
      }
    }
    if (!change.length) continue
    steps.push(
      step('limit', 1, change, [i], () => {
        const left = islands[i] - sumLo
        return `${cap(islandName(islands, n, i))} has ${bridges(left)} left to place, so no neighbour can have more than ${left}.`
      }),
    )
  }
  return steps
}

//isolate: more bridges on a link would close a group off from the rest
export const isolate = (islands, n, state) => {
  const { links } = linksOf(islands, n)
  const { lo, hi } = state
  const steps = []
  links.forEach((link, l) => {
    for (let v = lo[l] + 1; v <= hi[l]; v++) {
      const trial = lo.slice()
      trial[l] = v
      const group = closedGroups(islands, n, trial).find((g) => g.includes(link.a))
      if (!group) continue
      steps.push(
        step(
          'isolate',
          2,
          [[l, lo[l], v - 1]],
          group,
          () =>
            `${v === 1 ? 'A bridge' : 'Another bridge'} here would give the islands outlined all their bridges while leaving the rest of the puzzle cut off, so this link takes ${v === 1 ? 'none' : 'no more'}.`,
        ),
      )
      break
    }
  })
  return steps
}

//exit: a group of islands has one way out, so a bridge must go there
export const exit = (islands, n, state) => {
  const { links } = linksOf(islands, n)
  const { lo, hi } = state
  const cells = islandCells(islands)
  const parent = new Map(cells.map((i) => [i, i]))
  const find = (i) => {
    while (parent.get(i) !== i) {
      parent.set(i, parent.get(parent.get(i)))
      i = parent.get(i)
    }
    return i
  }
  links.forEach(({ a, b }, l) => lo[l] > 0 && parent.set(find(a), find(b)))
  const groups = new Map()
  for (const i of cells) groups.set(find(i), [...(groups.get(find(i)) || []), i])
  const steps = []
  for (const group of groups.values()) {
    if (group.length === cells.length) continue
    const root = find(group[0])
    const out = []
    links.forEach((link, l) => {
      const inside = find(link.a) === root
      if (hi[l] > 0 && lo[l] === 0 && inside !== (find(link.b) === root)) out.push(l)
    })
    if (out.length !== 1 || lo[out[0]] > 0) continue
    const l = out[0]
    steps.push(
      step(
        'exit',
        2,
        [[l, 1, hi[l]]],
        group,
        () => 'The islands outlined have only this one way out, so a bridge must go here.',
      ),
    )
  }
  return steps
}

const broke = (why, islands, n) =>
  why.group
    ? 'a group of islands would have all its bridges and be cut off from the rest'
    : `${islandName(islands, n, why.island)} could not be met`

//what if: a link is tried at a value; when the plain rules then break one, it holds another
export const whatIf = (islands, n, state) => {
  const { links } = linksOf(islands, n)
  const { lo, hi } = state
  for (let l = 0; l < links.length; l++) {
    if (lo[l] === hi[l]) continue
    for (const v of [lo[l], hi[l]]) {
      const trial = copyState(state)
      trial.lo[l] = v
      trial.hi[l] = v
      const why = {}
      if (settle(islands, n, trial, why)) continue
      const change = v === lo[l] ? [[l, lo[l] + 1, hi[l]]] : [[l, lo[l], hi[l] - 1]]
      const source = why.group ? why.group[0] : why.island
      return [
        step(
          'what-if',
          3,
          change,
          [source],
          () =>
            `If this link held ${bridges(v)}, following the plain rules from there, ${broke(why, islands, n)}. So it does not.`,
        ),
      ]
    }
  }
  return []
}

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1)

const techniques = [[need, full, crossed], [limit], [isolate, exit], [whatIf]]

//the easiest steps a state offers, using techniques up to a level
export const nextSteps = (islands, n, state, top = levels.length - 1) => {
  for (let level = 0; level <= top; level++) {
    for (const technique of techniques[level]) {
      const steps = technique(islands, n, state)
      if (steps.length) return { level, steps }
    }
  }
  return { steps: [] }
}

//puts steps on a state in place, false when one leaves a link with no value
export const apply = (state, steps) => {
  for (const { change } of steps) {
    for (const [l, least, most] of change) {
      state.lo[l] = Math.max(state.lo[l], least)
      state.hi[l] = Math.min(state.hi[l], most)
      if (state.lo[l] > state.hi[l]) return false
    }
  }
  return true
}

//a state that has every link decided
export const decided = ({ lo, hi }) => lo.every((v, l) => v === hi[l])

//the hardest level a puzzle needs and its solution, or null when techniques up to top can't finish
//it; the steps are sound, so finishing proves the solution is the only one
export const rate = (islands, n, top = levels.length - 1) => {
  const state = startState(islands, n)
  let hardest = 0
  while (!decided(state)) {
    const { level, steps } = nextSteps(islands, n, state, top)
    if (!steps.length || !apply(state, steps)) return null
    hardest = Math.max(hardest, level)
  }
  if (!solved(islands, n, state.lo)) return null
  return { level: hardest, solution: state.lo.slice() }
}

export { cellName, degreesOf }
