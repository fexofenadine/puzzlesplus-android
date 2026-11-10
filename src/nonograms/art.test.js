// @vitest-environment node
import { expect, it } from 'vitest'
import { artFiles, artFor, levelOf, parseArt, pickArt, pool } from './art'
import { cluesOf } from './rules'
import { random } from './generate'
it('reads every picture file and each one can be solved by logic', () => {
  const problems = []
  for (const [path, text] of Object.entries(artFiles)) {
    try {
      const art = parseArt(path, text)
      if (levelOf(art) === null) problems.push(`${path}: needs guessing`)
    } catch (error) {
      problems.push(error.message)
    }
  }
  expect(problems).toEqual([])
  expect(pool.length).toBe(Object.keys(artFiles).length)
})

it('has pictures for every size', () => {
  for (const n of [5, 10, 15, 20, 25]) expect(artFor(n).length).toBeGreaterThan(0)
})

it('picks the level asked for, else the nearest, and avoids the last one', () => {
  const rng = random(1)
  for (const n of [5, 10, 15, 20, 25]) {
    const levelsHere = artFor(n).map(levelOf)
    for (let level = 0; level < 4; level++) {
      const got = pickArt(n, level, rng)
      const gap = Math.min(...levelsHere.map((l) => Math.abs(l - level)))
      expect(Math.abs(got.level - level)).toBe(gap)
      expect(cluesOf(got.solution, n)).toEqual(got.clues)
    }
    if (artFor(n).length > 1) {
      const first = artFor(n)[0].id
      for (let k = 0; k < 20; k++) expect(pickArt(n, 0, rng, null, first).art.id).not.toBe(first)
    }
  }
})

it('gives the picture asked for by id, or null where there is none', () => {
  expect(pickArt(5, 3, random(1), '5/heart')).toMatchObject({ art: { name: 'Heart' } })
  expect(pickArt(7, 0, random(1))).toBe(null)
})

it('rejects pictures that are broken', () => {
  const head = 'name: A\ncredit: me\nlicence: CC0\n---\n'
  const grid = ['#####', '#...#', '#...#', '#...#', '#####'].join('\n')
  expect(parseArt('./art/5/ok.txt', head + grid).n).toBe(5)
  expect(() => parseArt('./art/5/x.txt', head + grid.replace('#...#', '#..'))).toThrow(/rows/)
  expect(() => parseArt('./art/10/x.txt', head + grid)).toThrow(/belongs in the 5 folder/)
  expect(() => parseArt('./art/5/x.txt', head.replace('credit: me\n', '') + grid)).toThrow(/credit/)
  expect(() => parseArt('./art/5/x.txt', 'name: A\n' + grid)).toThrow(/---/)
  const gap = ['#####', '#####', '.....', '#####', '#####'].join('\n')
  expect(() => parseArt('./art/5/x.txt', head + gap)).toThrow(/touch/)
})
