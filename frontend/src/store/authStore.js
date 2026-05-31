import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/auth'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const res = await authApi.login(credentials)
        const { user, access, refresh } = res.data
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)
        set({ user, accessToken: access, refreshToken: refresh, isAuthenticated: true })
        return user
      },

      register: async (data) => {
        const res = await authApi.register(data)
        const { user, access, refresh } = res.data
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)
        set({ user, accessToken: access, refreshToken: refresh, isAuthenticated: true })
        return user
      },

      logout: async () => {
        const refreshToken = get().refreshToken
        try {
          if (refreshToken) await authApi.logout(refreshToken)
        } catch {}
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      updateUser: (user) => set({ user }),

      loadProfile: async () => {
        const res = await authApi.getProfile()
        set({ user: res.data })
        return res.data
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
