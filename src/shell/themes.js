//the theme a first visit opens with
export const defaultTheme = 'synthwave'

//the theme menu, in alphabetical order by name (the default theme does not lead it)
export const themes = [
  ['classic', 'Classic'],
  ['matrix', 'Matrix'],
  ['nord', 'Nord'],
  ['solarized-phosphor', 'Solarized Phosphor'],
  ['solarized', 'Solarized Truchet'],
  ['synthwave', 'Synthwave'],
  ['terafox', 'Terafox Hex Trail'],
  ['vaporwave', 'Vaporwave'],
]

//theme ids that were renamed, so a saved choice still finds its theme
export const renamed = { everforest: 'terafox', 'terafox-coral': 'terafox' }
