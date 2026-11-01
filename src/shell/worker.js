import { phone } from './phone'

//the app carries its files, so only the website needs the worker
//the shared worker sits beside the game folders, each game is its own scope
export const registerWorker = () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD && !phone) {
    //refused when storage is blocked, which is fine
    navigator.serviceWorker.register('../service-worker.js', { scope: './' }).catch(() => {})
  }
}
