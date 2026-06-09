import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { splitsApi } from '../api/splits'

const initialState = {
  groups: [],
  currentGroup: null,
  expenses: [],
  balances: null,
  loading: false,
  error: null,
}

export const fetchGroups = createAsyncThunk('splits/fetchGroups', async () => {
  const res = await splitsApi.listGroups()
  return res.data.results || res.data
})

export const fetchGroup = createAsyncThunk('splits/fetchGroup', async (id) => {
  const res = await splitsApi.getGroup(id)
  return res.data
})

export const createGroup = createAsyncThunk('splits/createGroup', async (data) => {
  const res = await splitsApi.createGroup(data)
  return res.data
})

export const fetchExpenses = createAsyncThunk(
  'splits/fetchExpenses',
  async (groupId) => {
    const res = await splitsApi.listExpenses({ group: groupId })
    return res.data.results || res.data
  }
)

export const createExpense = createAsyncThunk(
  'splits/createExpense',
  async (data) => {
    const res = await splitsApi.createExpense(data)
    return res.data
  }
)

export const deleteExpense = createAsyncThunk(
  'splits/deleteExpense',
  async (id) => {
    await splitsApi.deleteExpense(id)
    return id
  }
)

export const fetchBalances = createAsyncThunk(
  'splits/fetchBalances',
  async (groupId) => {
    const res = await splitsApi.getBalances(groupId)
    return res.data
  }
)

export const settle = createAsyncThunk(
  'splits/settle',
  async ({ groupId, data }) => {
    const res = await splitsApi.settle(groupId, data)
    return res.data
  }
)

export const addMember = createAsyncThunk(
  'splits/addMember',
  async ({ groupId, data }) => {
    const res = await splitsApi.addMember(groupId, data)
    return res.data
  }
)

const splitsSlice = createSlice({
  name: 'splits',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.groups = action.payload
        state.loading = false
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || null
      })
      .addCase(fetchGroup.fulfilled, (state, action) => {
        state.currentGroup = action.payload
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.groups = [...state.groups, action.payload]
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.expenses = action.payload
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.expenses = [action.payload, ...state.expenses]
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter((e) => e.id !== action.payload)
      })
      .addCase(fetchBalances.fulfilled, (state, action) => {
        state.balances = action.payload
      })
      .addCase(addMember.fulfilled, (state, action) => {
        if (state.currentGroup) {
          state.currentGroup = {
            ...state.currentGroup,
            members: [...(state.currentGroup.members || []), action.payload],
          }
        }
      })
  },
})

export const selectSplits = (state) => state.splits

export default splitsSlice.reducer
