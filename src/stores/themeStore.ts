import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  darkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (value: boolean) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      darkMode: false,
      toggleDarkMode: () => {
        const next = !get().darkMode
        document.documentElement.classList.toggle('dark', next)
        set({ darkMode: next })
      },
      setDarkMode: (value) => {
        document.documentElement.classList.toggle('dark', value)
        set({ darkMode: value })
      },
    }),
    { name: 'flockdesk-theme' }
  )
)