import { h } from 'hyperapp'
import s from './FireworksCanvas.module.css'

//the canvas the fireworks draw on, inside the page so it sits over the wallpaper and the game window
const FireworksCanvas = ({ key }) => <canvas key={key} id="fireworks" class={s.canvas} />

export default FireworksCanvas
