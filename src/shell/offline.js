//makes a game ready to play offline: the files its page has not asked for yet (other themes'
//backgrounds, fonts and wallpapers, the guide) are put in the worker's cache while the page idles
//assets.json, written by the build, lists every file under assets/

//copies whatever of the list the cache lacks, one at a time, stopping at the first failure
export const warm = async (cache, files, has) => {
  let added = 0
  for (const file of files) {
    if (await has(file)) continue
    try {
      await cache.add(file)
      added++
    } catch {
      //offline or out of room, the rest waits for another visit
      break
    }
  }
  return added
}

//the list as addresses, with this game's guide page
const listed = async () => {
  const answer = await fetch('../assets.json', { cache: 'no-cache' })
  if (!answer.ok) return []
  const files = await answer.json()
  return [
    ...files.map((file) => new URL(`../${file}`, location.href).href),
    new URL('guide/', location.href).href,
  ]
}

//waits for a quiet moment after the page has loaded; not on a metered connection
export const warmWhenIdle = () => {
  if (!('caches' in window) || (navigator.connection && navigator.connection.saveData)) return
  const run = async () => {
    try {
      //the worker's cache is named after its scope, this game's folder
      const cache = await caches.open(new URL('./', location.href).href)
      await warm(cache, await listed(), (file) => caches.match(file))
    } catch {
      //no cache here, the game still plays online
    }
  }
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 3000))
  const later = () => idle(run, { timeout: 10000 })
  if (document.readyState === 'complete') later()
  else window.addEventListener('load', later)
}
