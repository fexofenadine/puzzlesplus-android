import { h } from 'hyperapp'
import { Rules } from '../2048/HowToPlay'
import { Board } from '../2048/Game'
import { tilesOf } from '../2048/rules'
import { suggest } from '../2048/search'
import { Figure } from './Guide'
import { desktopSection } from './desktop'

//strategy examples, each with the move the hint picks there, which a test holds it to
export const examples = {
  corner: { values: [128, 64, 16, 4, 8, 8, 4, 2, 2, 0, 0, 0, 0, 0, 0, 0], dir: 'left' },
  row: { values: [512, 256, 128, 64, 2, 4, 16, 8, 0, 2, 4, 0, 0, 0, 2, 0], dir: 'left' },
  merge: { values: [64, 32, 16, 8, 4, 8, 8, 4, 2, 0, 0, 2, 0, 0, 0, 0], dir: 'right' },
}

const start = [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0]

const noop = () => null

//a board, captioned with the hint's advice when it is an example
const TwentyExample = ({ values, hint }) => {
  const n = Math.sqrt(values.length)
  const caption = hint && suggest(values, n).text
  return (
    <Figure caption={caption}>
      <Board n={n} tiles={tilesOf(values, 1).tiles} onDown={noop} />
    </Figure>
  )
}

const Example = ({ id }) => <TwentyExample values={examples[id].values} hint />

export const parts = [
  {
    title: 'How to Play',
    sections: [
      {
        id: 'rules',
        title: 'The rules',
        body: () => [
          <Rules />,
          <p>A new game starts with two tiles.</p>,
          <TwentyExample values={start} />,
        ],
      },
      {
        id: 'records',
        title: 'Sizes and best scores',
        body: () => [
          <p>
            The Size menu has 3 × 3 to 5 × 5. Smaller boards fill up fast and need care from the
            first move, bigger ones forgive more and run longer. On 3 × 3 the winning tile is 512,
            since 2048 can't fit.
          </p>,
          <p>
            Each size keeps a best score with the highest tile of that game, one table for games
            played alone and one for games that used a hint or undo. The name box opens when a game
            ends, or when you leave it for a new one, with a better score than the table's.
          </p>,
        ],
      },
      {
        id: 'hints',
        title: 'Hints and undo',
        body: () => [
          <p>
            <b>Hint</b> (H, the Game menu or the ? button) looks two moves ahead, over the tiles
            that might appear, and picks the move that leaves the board in the best shape: free
            cells, rows and columns that run one way, neighbours close in value and the biggest tile
            in a corner. It says why under the board. It is advice, not a proof, since the next tile
            is chance.
          </p>,
          <p>
            <b>Undo</b> (Ctrl+Z or the arrow button) takes back as many moves as you like, even out
            of a lost game. Either one moves the game's score to the helped table. The clock is off
            unless you turn on <b>Timer</b> in the Game menu.
          </p>,
        ],
      },
      desktopSection,
    ],
  },
  {
    title: 'Strategy',
    sections: [
      {
        id: 'corner',
        title: 'Keep the biggest tile in a corner',
        body: () => [
          <p>
            Pick a corner and keep your biggest tile there. Mostly use the two moves that push
            towards it, a third when you must, and the fourth only when nothing else moves, since
            that is the one that pulls the big tile out.
          </p>,
          <Example id="corner" />,
        ],
      },
      {
        id: 'row',
        title: 'Keep its row full and in order',
        body: () => [
          <p>
            Build the corner's row from big to small. While that row is full, sliding along it can't
            shift the big tile, and tiles coming down from the rest of the board meet the row's
            small end first.
          </p>,
          <Example id="row" />,
        ],
      },
      {
        id: 'merge',
        title: 'Merge towards the corner',
        body: () => [
          <p>
            Bring each new tile up to the size of its neighbour in the row, so the row merges down
            like a chain into the corner. Moves that make several merges at once are worth most, as
            long as they keep the corner.
          </p>,
          <Example id="merge" />,
        ],
      },
      {
        id: 'stuck',
        title: 'When the corner is lost',
        body: () => [
          <p>
            Sooner or later only the fourth move is left and the big tile leaves its corner. Don't
            panic: a small tile usually drops into the gap, so look for the move that slides the big
            tile straight back, or build the new corner tile up to match it. Undo is there too, if
            you don't mind the helped table.
          </p>,
        ],
      },
    ],
  },
]
