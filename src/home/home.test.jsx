import { beforeEach, expect, it, vi } from 'vitest'

const home = async (saved) => {
  document.body.innerHTML = '<div id="app"><main></main></div>'
  localStorage.clear()
  if (saved) localStorage.setItem('lastGame', saved)
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, addListener() {} }))
  vi.resetModules()
  const { startHome } = await import('./home')
  startHome()
  await new Promise((resolve) => setTimeout(resolve, 20))
  return document.body
}

beforeEach(() => localStorage.clear())

it('lists every game with its guide', async () => {
  const body = await home(null)
  const hrefs = [...body.querySelectorAll('a')].map((a) => a.getAttribute('href'))
  for (const id of [
    'minesweeper',
    'takuzu',
    'nonograms',
    'sudoku',
    '2048',
    'lightup',
    'futoshiki',
    'bridges',
  ]) {
    expect(hrefs).toContain(`${id}/`)
    expect(hrefs).toContain(`${id}/guide/`)
  }
  expect(body.textContent).not.toContain('Continue')
})

it('puts the game played last first as Continue', async () => {
  const body = await home('sudoku')
  const first = body.querySelector('[aria-label=Continue] a')
  expect(first.textContent).toContain('Continue Sudoku')
  expect(first.getAttribute('href')).toBe('sudoku/')
})

it('ignores a saved game that is not one of ours', async () => {
  expect((await home('solitaire')).textContent).not.toContain('Continue')
})
