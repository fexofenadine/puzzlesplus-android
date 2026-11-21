import { cellName, plural } from '../shell/grid'

//bridges (hashi): islands on a grid joined by bridges, one or two between a pair in line
//an island's number is the bridges it has, bridges never cross, and every island is reachable
//from every other

//islands are n * n cells in row order: 0 for water, else the island's number (1 to 8)
export const sizes = [7, 10, 14]

export const emptyBoard = (links) => new Int8Array(links)

export { cellName, plural }

//an island's name in a sentence
export const islandName = (islands, n, i) => `the ${islands[i]} at ${cellName(i, n)}`

const cache = new WeakMap()

//the links between islands: pairs next to each other in a row or column with only water between
//{ links: [{ a, b, across, cells, max }], at, over, through }
//a < b, cells the water between them, max the most bridges they can take (never above the
//smaller number, never above 2); at[i] the links of island i, over[l] the links that would
//cross l, through[cell] the links passing over a water cell
export const linksOf = (islands, n) => {
  let found = cache.get(islands)
  if (found) return found
  const links = []
  const scan = (outer, step, across) => {
    for (let o = 0; o < n; o++) {
      let last = -1
      for (let k = 0; k < n; k++) {
        const i = across ? o * n + k : k * n + o
        if (!islands[i]) continue
        if (last >= 0 && i - last > step) {
          const cells = []
          for (let c = last + step; c < i; c += step) cells.push(c)
          links.push({ a: last, b: i, across, cells, max: Math.min(2, islands[last], islands[i]) })
        }
        last = i
      }
    }
  }
  scan(n, 1, true)
  scan(n, n, false)
  const at = new Map()
  const through = new Map()
  links.forEach(({ a, b, cells }, l) => {
    for (const i of [a, b]) at.set(i, [...(at.get(i) || []), l])
    for (const c of cells) through.set(c, [...(through.get(c) || []), l])
  })
  const over = links.map(() => [])
  for (const list of through.values()) {
    for (const l of list) for (const o of list) if (l !== o) over[l].push(o)
  }
  found = { links, at, over, through }
  cache.set(islands, found)
  return found
}

//the islands as a list of cells
export const islandCells = (islands) => {
  const list = []
  islands.forEach((v, i) => v && list.push(i))
  return list
}

//the bridges at each island, 0 on water
export const degreesOf = (islands, n, board) => {
  const degree = new Int8Array(n * n)
  linksOf(islands, n).links.forEach(({ a, b }, l) => {
    degree[a] += board[l]
    degree[b] += board[l]
  })
  return degree
}

//the groups of islands joined by bridges, each a list of cells
export const groupsOf = (islands, n, board) => {
  const { links } = linksOf(islands, n)
  const parent = new Map(islandCells(islands).map((i) => [i, i]))
  const find = (i) => {
    while (parent.get(i) !== i) {
      parent.set(i, parent.get(parent.get(i)))
      i = parent.get(i)
    }
    return i
  }
  links.forEach(({ a, b }, l) => board[l] > 0 && parent.set(find(a), find(b)))
  const groups = new Map()
  for (const i of parent.keys()) groups.set(find(i), [...(groups.get(find(i)) || []), i])
  return [...groups.values()]
}

//the bridges each link could still take on a board: what is there plus what the islands at both
//ends have room for, and nothing more where a bridge across it stands
const roomOn = (islands, n, board, degree, l) => {
  const { links, over } = linksOf(islands, n)
  const { a, b, max } = links[l]
  if (over[l].some((o) => board[o] > 0)) return board[l]
  const more = Math.min(max - board[l], islands[a] - degree[a], islands[b] - degree[b])
  return board[l] + Math.max(0, more)
}

//each broken rule with its cells and a sentence: an island with too many bridges, one that can
//no longer reach its number, a bridge across another, or a group with all its bridges that is
//cut off from the rest
export const breaks = (islands, n, board) => {
  const { links, at, over } = linksOf(islands, n)
  const degree = degreesOf(islands, n, board)
  const found = []
  for (const i of islandCells(islands)) {
    const name = islandName(islands, n, i)
    if (degree[i] > islands[i]) {
      found.push({
        cells: [i],
        text: `${name} has ${plural(degree[i], 'bridge')}, too many.`.replace('the', 'The'),
      })
      continue
    }
    const reach = (at.get(i) || []).reduce(
      (sum, l) => sum + roomOn(islands, n, board, degree, l) - board[l],
      0,
    )
    if (degree[i] + reach < islands[i]) {
      found.push({
        cells: [i],
        text: `${name} can no longer reach its number of bridges.`.replace('the', 'The'),
      })
    }
  }
  links.forEach((link, l) => {
    const crossed = over[l].find((o) => o > l && board[o] > 0)
    if (board[l] > 0 && crossed !== undefined) {
      found.push({
        cells: [link.a, link.b, links[crossed].a, links[crossed].b],
        links: [l, crossed],
        text: 'These two bridges cross.',
      })
    }
  })
  const total = islandCells(islands).length
  for (const group of groupsOf(islands, n, board)) {
    if (group.length < total && group.every((i) => degree[i] === islands[i])) {
      found.push({
        cells: group,
        text: 'These islands have all their bridges, but nothing joins them to the others.',
      })
    }
  }
  return found
}

//the islands that take part in a broken rule
export const violations = (islands, n, board) =>
  new Set(breaks(islands, n, board).flatMap((b) => b.cells))

//every island has its number of bridges, none cross, and all the islands are one group
export const solved = (islands, n, board) => {
  const { links, over } = linksOf(islands, n)
  const degree = degreesOf(islands, n, board)
  for (const i of islandCells(islands)) if (degree[i] !== islands[i]) return false
  for (let l = 0; l < links.length; l++) {
    if (board[l] > 0 && over[l].some((o) => board[o] > 0)) return false
  }
  return groupsOf(islands, n, board).length === 1
}

//the islands still without their number of bridges, for the scoreboard
export const unfinished = (islands, n, board) => {
  const degree = degreesOf(islands, n, board)
  return islandCells(islands).filter((i) => degree[i] !== islands[i]).length
}

//the link from island a to island b, -1 when there is none
export const linkBetween = (islands, n, a, b) =>
  linksOf(islands, n).links.findIndex(
    (link) => link.a === Math.min(a, b) && link.b === Math.max(a, b),
  )

//the bridges one more click puts on a link: 0, 1, 2 and round again; null when a bridge across
//stands, or from nothing when its islands are full only if free is false
export const stepLink = (islands, n, board, l, back = false) => {
  const { links, over } = linksOf(islands, n)
  const to = (board[l] + (back ? 2 : 1)) % 3
  if (to > links[l].max) return back ? links[l].max : 0
  if (to > board[l] && over[l].some((o) => board[o] > 0)) return null
  return to
}
