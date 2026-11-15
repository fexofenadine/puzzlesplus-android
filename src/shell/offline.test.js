// @vitest-environment node
import { expect, it } from 'vitest'
import { warm } from './offline'

it('stores only the files the cache lacks, and stops at the first that fails', async () => {
  const kept = new Set(['a.js'])
  const cache = {
    add: async (file) => {
      if (file === 'd.js') throw new Error('offline')
      kept.add(file)
    },
  }
  const added = await warm(cache, ['a.js', 'b.js', 'c.js', 'd.js', 'e.js'], async (file) =>
    kept.has(file),
  )
  expect(added).toBe(2)
  expect([...kept]).toEqual(['a.js', 'b.js', 'c.js'])
})
