// Global theme helper: manage theme and notify listeners
export const setTheme = (theme: string) => {
  if (theme === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
  try { localStorage.setItem('theme', theme) } catch {}
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }))
}

export const getTheme = (): string => {
  try {
    return (localStorage.getItem('theme') as string) || 'light'
  } catch {
    return 'light'
  }
}

export const onThemeChange = (cb: (theme: string) => void) => {
  const handler = (e: any) => cb(e.detail)
  window.addEventListener('theme-changed', handler)
  return () => window.removeEventListener('theme-changed', handler)
}
