import { createAsyncThunk } from '@reduxjs/toolkit'

// Wraps createAsyncThunk with consistent error handling. On failure we reject
// with a serializable shape that getErrorMessage() understands (it reads
// `error.response.data`), so existing `toast.error(getErrorMessage(err))`
// catch blocks keep working after `.unwrap()` re-throws this payload.
export function apiThunk(type, payloadCreator) {
  return createAsyncThunk(type, async (arg, thunkApi) => {
    try {
      return await payloadCreator(arg, thunkApi)
    } catch (err) {
      return thunkApi.rejectWithValue({
        response: { data: err?.response?.data },
        message: err?.message || 'Request failed',
      })
    }
  })
}
