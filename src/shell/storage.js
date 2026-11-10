//settings that survive blocked storage
export const load = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

//after a backup is restored nothing is written until the page reloads
let frozen = false

export const freeze = () => {
  frozen = true
}

export const save = (key, value) => {
  if (frozen) return
  try {
    localStorage.setItem(key, value)
  } catch {
    //settings just are not remembered
  }
}

export const remove = (key) => {
  if (frozen) return
  try {
    localStorage.removeItem(key)
  } catch {
    //nothing was stored
  }
}

//every key kept on this site, ours or not
export const keys = () => {
  try {
    return Object.keys(localStorage)
  } catch {
    return []
  }
}
