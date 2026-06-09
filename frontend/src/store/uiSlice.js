import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  theme: 'system',
  sidebarOpen: true,
  modals: {},
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload
    },
    openModal: (state, action) => {
      const { name, data = {} } = action.payload
      state.modals[name] = { open: true, data }
    },
    closeModal: (state, action) => {
      const name = action.payload
      state.modals[name] = { open: false, data: {} }
    },
  },
})

export const { setTheme, toggleSidebar, setSidebarOpen, openModal, closeModal } =
  uiSlice.actions

// Selector helper: returns a selector for a given modal name.
export const selectModal = (name) => (state) =>
  state.ui.modals[name] || { open: false, data: {} }

export default uiSlice.reducer
