export type Theme = 'dark' | 'light'

const THEME_STORAGE_KEY = 'thoughthub-theme'

export function applyTheme(theme: Theme, persist = true) {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.bsTheme = theme
  document.documentElement.style.colorScheme = theme

  if (!persist) {
    return
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The theme still works for this session when storage is unavailable.
  }
}

export function initializeTheme(): Theme {
  let theme: Theme = 'dark'

  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'light' || savedTheme === 'dark') {
      theme = savedTheme
    }
  } catch {
    // Keep the dark default when browser storage is unavailable.
  }

  applyTheme(theme, false)
  return theme
}
