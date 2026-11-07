import { expect, it } from 'vitest'
import { app, h } from 'hyperapp'
import { guideTopic as minesTopic } from '../hint'
import { exampleHint } from './MinesExample'
import { exampleStep as takuzuStep } from './TakuzuExample'
import { boardStep, lineStep } from './NonogramsExample'
import { examples as minesExamples, parts as minesParts } from './minesweeper'
import { examples as takuzuExamples, parts as takuzuParts } from './takuzu'
import { lines, parts as nonogramsParts, whatIf } from './nonograms'
import { parts as howToParts } from './howToPlay'
import { easiest, exampleStep } from './SudokuExample'
import { examples as sudokuExamples, parts as sudokuParts } from './sudoku'
import { guideTopic as sudokuTopic } from '../sudoku/hint'
import { examples as twentyExamples, parts as twentyParts } from './2048'
import { suggest } from '../2048/search'

const ids = (parts) => parts.flatMap((part) => part.sections.map((section) => section.id))

it('shows every minesweeper example the hint its section is about', () => {
  for (const [topic, example] of Object.entries(minesExamples)) {
    expect(minesTopic(exampleHint(example)), topic).toBe(topic)
    expect(ids(minesParts)).toContain(topic)
  }
})

it('finds every takuzu technique in its example, at the easiest level the board offers', () => {
  for (const [technique, rows] of Object.entries(takuzuExamples)) {
    expect(takuzuStep(rows, technique), technique).toBeTruthy()
    expect(ids(takuzuParts)).toContain(technique)
  }
})

it('finds every nonograms technique in its example', () => {
  for (const [technique, { clue, values }] of Object.entries(lines)) {
    expect(lineStep(clue, values, technique), technique).toBeTruthy()
    expect(ids(nonogramsParts)).toContain(technique)
  }
  expect(boardStep(whatIf.clues, whatIf.rows, 'what-if')).toBeTruthy()
})

it('finds every sudoku technique in its example, as the easiest step there', () => {
  for (const [technique, example] of Object.entries(sudokuExamples)) {
    expect(exampleStep(example, technique), technique).toBeTruthy()
    expect(easiest(example), technique).toBe(technique)
    expect(ids(sudokuParts)).toContain(sudokuTopic({ kind: technique }))
  }
  for (const kind of ['naked-quad', 'hidden-quad', 'jellyfish', 'break', 'wrong', 'note']) {
    expect(ids(sudokuParts)).toContain(sudokuTopic({ kind }))
  }
})

it('captions every 2048 example with the move the hint really picks there', () => {
  for (const [id, { values, dir }] of Object.entries(twentyExamples)) {
    expect(suggest(values, 4).dir, id).toBe(dir)
    expect(ids(twentyParts)).toContain(id)
  }
  expect(ids(twentyParts)).toContain('hints')
})

//every hint a game gives lands on a section of its guide
it('has a section for every topic a hint can link to', () => {
  const minesTopics = ['wrong-flags', 'chording', 'guessing', 'first-click', 'mine-counter']
  for (const topic of minesTopics) expect(ids(minesParts)).toContain(topic)
  expect(ids(takuzuParts)).toContain('mistakes')
  expect(ids(nonogramsParts)).toContain('mistakes')
})

it('renders every guide without crashing', async () => {
  for (const parts of [
    minesParts,
    takuzuParts,
    nonogramsParts,
    sudokuParts,
    twentyParts,
    howToParts,
  ]) {
    const container = document.createElement('div')
    await new Promise((resolve) => {
      const view = () => (
        <div oncreate={resolve}>
          {parts.map((part) => part.sections.map((section) => section.body()))}
        </div>
      )
      app({}, {}, view, container)
    })
    expect(container.querySelectorAll('figure').length).toBeGreaterThan(
      parts === howToParts ? -1 : 3,
    )
  }
})
