//the edges a jigsaw board draws: a cell's top and left sides, where the cell above or to the
//left is in another region (the other sides are those cells' own), as the css variables
//SudokuCell.module.css reads
const line = 'var(--grid-line, var(--dark-shadow))'
const sides = [
  ['--et', 'inset 0 2px 0 0', (i, n) => i - n],
  ['--el', 'inset 2px 0 0 0', (i, n) => (i % n ? i - 1 : -1)],
]

export const regionEdges = (layout, n) =>
  Array.from({ length: n * n }, (_, i) =>
    Object.fromEntries(
      sides.flatMap(([name, shadow, next]) => {
        const j = next(i, n)
        return j >= 0 && layout[j] !== layout[i] ? [[name, `${shadow} ${line}`]] : []
      }),
    ),
  )
