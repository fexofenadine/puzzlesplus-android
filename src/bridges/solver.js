import { groupsOf, islandCells, linksOf } from './rules'

//what a solver knows of each link: the fewest and the most bridges it can still hold
export const startState = (islands, n) => {
  const { links } = linksOf(islands, n)
  return { lo: new Int8Array(links.length), hi: Int8Array.from(links, (l) => l.max) }
}

export const copyState = ({ lo, hi }) => ({ lo: lo.slice(), hi: hi.slice() })

//the groups of islands the placed bridges (lo) join that have all their bridges but are not
//every island
export const closedGroups = (islands, n, lo) => {
  const { at } = linksOf(islands, n)
  const total = islandCells(islands).length
  const sum = (i) => (at.get(i) || []).reduce((s, l) => s + lo[l], 0)
  return groupsOf(islands, n, lo).filter(
    (group) => group.length < total && group.every((i) => sum(i) === islands[i]),
  )
}

//the plain rules run to a standstill on a state, in place: an island's bridges add up to its number
//(so each link has at least what the others can't give and at most what the others leave), a
//bridge shuts the ones across it, and a group with all its bridges must be everything
//false when a rule breaks; why, when given, is told what broke: { island } or { group }
export const settle = (islands, n, state, why) => {
  const { links, at, over } = linksOf(islands, n)
  const { lo, hi } = state
  const cells = islandCells(islands)
  for (let changed = true; changed;) {
    changed = false
    for (let l = 0; l < links.length; l++) {
      if (lo[l] > hi[l]) {
        if (why) why.island = links[l].a
        return false
      }
      if (lo[l] === 0) continue
      for (const o of over[l]) {
        if (lo[o] > 0) {
          if (why) why.island = links[l].a
          return false
        }
        if (hi[o] > 0) {
          hi[o] = 0
          changed = true
        }
      }
    }
    for (const i of cells) {
      const list = at.get(i) || []
      let sumLo = 0
      let sumHi = 0
      for (const l of list) {
        sumLo += lo[l]
        sumHi += hi[l]
      }
      if (sumLo > islands[i] || sumHi < islands[i]) {
        if (why) why.island = i
        return false
      }
      for (const l of list) {
        const most = Math.min(hi[l], islands[i] - (sumLo - lo[l]))
        const least = Math.max(lo[l], islands[i] - (sumHi - hi[l]))
        if (most < hi[l]) {
          hi[l] = most
          changed = true
        }
        if (least > lo[l]) {
          lo[l] = least
          changed = true
        }
      }
    }
  }
  const closed = closedGroups(islands, n, lo)
  if (closed.length) {
    if (why) why.group = closed[0]
    return false
  }
  return true
}

//the link with the most left to decide for the search to branch on: the one at the island
//with the fewest undecided links, -1 when every link is decided
const pick = (islands, n, { lo, hi }) => {
  const { links, at } = linksOf(islands, n)
  let best = -1
  let fewest = Infinity
  links.forEach((_, l) => {
    if (lo[l] === hi[l]) return
    const count = Math.min(
      ...[links[l].a, links[l].b].map((i) => at.get(i).filter((c) => lo[c] < hi[c]).length),
    )
    if (count < fewest) {
      fewest = count
      best = l
    }
  })
  return best
}

//walks the solutions, each value of the chosen link in turn; found(lo) returns true to stop
//budget.steps counts the branches left, the search stops when it runs out
const search = (islands, n, state, found, budget = { steps: Infinity }) => {
  if (--budget.steps < 0 || !settle(islands, n, state)) return false
  const l = pick(islands, n, state)
  if (l < 0) return found(state.lo)
  for (let v = state.hi[l]; v >= state.lo[l]; v--) {
    const trial = copyState(state)
    trial.lo[l] = v
    trial.hi[l] = v
    if (search(islands, n, trial, found, budget)) return true
  }
  return false
}

//how many solutions, counting no further than limit; a search that runs out of steps counts
//as limit, so a puzzle too hard to settle is never taken for one with a single answer
export const countSolutions = (islands, n, limit = 2, steps = Infinity) => {
  let count = 0
  const budget = { steps }
  search(islands, n, startState(islands, n), () => ++count >= limit, budget)
  return budget.steps < 0 ? limit : count
}

//a solution as the bridges on each link, null when there is none
export const solve = (islands, n) => {
  let solution = null
  search(islands, n, startState(islands, n), (lo) => {
    solution = lo.slice()
    return true
  })
  return solution
}
