import { expect, it } from 'vitest'
import { changelog, released, version } from './version'

it('gives the version from package.json and the release day in words', () => {
  expect(version).toMatch(/^\d+\.\d+\.\d+$/)
  expect(released).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/)
})

it('links to the changelog on github', () => {
  expect(changelog).toMatch(/^https:\/\/github\.com\/fexofenadine\/puzzlesplus\/.*CHANGELOG\.md$/)
})
