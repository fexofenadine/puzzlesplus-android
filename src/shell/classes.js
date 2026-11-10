//class names joined, leaving out the ones switched off
export const cx = (...names) => names.filter(Boolean).join(' ')
