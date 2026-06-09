import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../api/auth'

// Mirror tokens into stable localStorage keys so the axios interceptor
// (which reads 'access_token' / 'refresh_token') keeps working independently
// of redux-persist's serialization format.
function persistTokens(access, refresh) {
  if (access) localStorage.setItem('access_token', access)
  if (refresh) localStorage.setItem('refresh_token', refresh)
}

function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export const login = createAsyncThunk('auth/login', async (credentials) => {
  const res = await authApi.login(credentials)
  const { user, access, refresh } = res.data
  persistTokens(access, refresh)
  return { user, access, refresh }
})

export const register = createAsyncThunk('auth/register', async (data) => {
  const res = await authApi.register(data)
  const { user, access, refresh } = res.data
  persistTokens(access, refresh)
  return { user, access, refresh }
})

export const logout = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const refreshToken = getState().auth.refreshToken
  try {
    if (refreshToken) await authApi.logout(refreshToken)
  } catch {
    // ignore logout API failures; still clear local state
  }
  clearTokens()
})

export const loadProfile = createAsyncThunk('auth/loadProfile', async () => {
  const res = await authApi.getProfile()
  return res.data
})

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateUser: (state, action) => {
      state.user = action.payload
    },
  },
  extraReducers: (builder) => {
    const setAuthenticated = (state, action) => {
      const { user, access, refresh } = action.payload
      state.user = user
      state.accessToken = access
      state.refreshToken = refresh
      state.isAuthenticated = true
      state.status = 'succeeded'
      state.error = null
    }

    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(login.fulfilled, setAuthenticated)
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error?.message || 'Login failed'
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(register.fulfilled, setAuthenticated)
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error?.message || 'Registration failed'
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.isAuthenticated = false
        state.status = 'idle'
        state.error = null
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
  },
})

export const { updateUser } = authSlice.actions

export const selectAuth = (state) => state.auth
export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated

export default authSlice.reducer
