//a board as a link: the page's address with #play=<size>.<level>.<cells>
//the cells themselves travel, so a link still opens the same board after the dealer changes

const SITE = 'https://fexofenadine.github.io/puzzlesplus/'

//cell values below base as one number in base 36
export const pack = (values, base) => {
  let all = 0n
  for (const value of values) all = all * BigInt(base) + BigInt(value)
  return all.toString(36)
}

//count values back from pack's text, null when it is not one
export const unpack = (text, count, base) => {
  if (!/^[0-9a-z]+$/.test(text)) return null
  let all = 0n
  for (const letter of text) all = all * 36n + BigInt(parseInt(letter, 36))
  const values = new Array(count)
  for (let i = count - 1; i >= 0; i--) {
    values[i] = Number(all % BigInt(base))
    all /= BigInt(base)
  }
  return all === 0n ? values : null
}

export const codeOf = (n, level, values, base) => `${n}.${level}.${pack(values, base)}`

//a code's size, level and cells, null unless check(n, level) holds and the cells fit
export const partsOf = (code, base, check) => {
  const [size, grade, data, ...rest] = code.split('.')
  const n = Number(size)
  const level = Number(grade)
  if (rest.length || !data || !check(n, level)) return null
  const values = unpack(data, n * n, base)
  return values && { n, level, values }
}

//the app and a local copy have no address of their own to hand out, so they give the site's
export const linkOf = (page, code) => {
  const { protocol, hostname, origin, pathname } = location
  const web = /^https?:$/.test(protocol) && hostname !== 'localhost' && hostname !== '127.0.0.1'
  return `${web ? origin + pathname : `${SITE}${page}/`}#play=${code}`
}

//the code this page was opened with, taken out of the address so a reload plays on
export const sharedCode = () => {
  const found = /^#play=([\w.]+)$/.exec(location.hash)
  if (!found) return null
  history.replaceState(null, '', location.pathname + location.search)
  return found[1]
}

//copies text, false where the browser refuses
export const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
