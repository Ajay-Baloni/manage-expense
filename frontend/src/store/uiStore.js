import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUiStore = create(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: true,
      modals: {},

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      openModal: (name, data = {}) =>
        set((s) => ({ modals: { ...s.modals, [name]: { open: true, data } } })),
      closeModal: (name) =>
        set((s) => ({ modals: { ...s.modals, [name]: { open: false, data: {} } } })),
      getModal: (name) => (s) => s.modals[name] || { open: false, data: {} },
    }),
    {
      name: 'ui-storage',
      partialize: (s) => ({ theme: s.theme, sidebarOpen: s.sidebarOpen }),
    }
  )
)
