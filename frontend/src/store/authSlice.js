import { createSlice } from '@reduxjs/toolkit'
import { authApi } from '../api/auth'
import { apiThunk } from './thunkUtils'

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
}

function persistTokens(access, refresh) {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export const login = apiThunk('auth/login', async (credentials) => {
  const res = await authApi.login(credentials)
  const { user, access, refresh } = res.data
  persistTokens(access, refresh)
  return { user, access, refresh }
})

export const register = apiThunk('auth/register', async (data) => {
  const res = await authApi.register(data)
  const { user, access, refresh } = res.data
  persistTokens(access, refresh)
  return { user, access, refresh }
})

export const logout = apiThunk('auth/logout', async (_, { getState }) => {
  const { refreshToken } = getState().auth
  try {
    if (refreshToken) await authApi.logout(refreshToken)
  } catch {
    // ignore network/expiry errors on logout
  }
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
})

export const loadProfile = apiThunk('auth/loadProfile', async () => {
  const res = await authApi.getProfile()
  return res.data
})

export const updateProfile = apiThunk('auth/updateProfile', async (data) => {
  const res = await authApi.updateProfile(data)
  return res.data
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
    },
  },
  extraReducers: (builder) => {
    const onAuthSuccess = (state, action) => {
      state.user = action.payload.user
      state.accessToken = action.payload.access
      state.refreshToken = action.payload.refresh
      state.isAuthenticated = true
    }
    builder
      .addCase(login.fulfilled, onAuthSuccess)
      .addCase(register.fulfilled, onAuthSuccess)
      .addCase(logout.fulfilled, () => initialState)
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
  },
})

export const { setUser } = authSlice.actions
export default authSlice.reducer
