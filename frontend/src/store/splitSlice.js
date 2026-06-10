import { createSlice } from '@reduxjs/toolkit'
import { splitsApi } from '../api/splits'
import { apiThunk } from './thunkUtils'

const initialState = {
  groups: [],
  currentGroup: null,
  expenses: [],
  balances: null,
  loading: false,
}

export const fetchGroups = apiThunk('splits/fetchGroups', async () => {
  const res = await splitsApi.listGroups()
  return res.data.results || res.data
})

export const fetchGroup = apiThunk('splits/fetchGroup', async (id) => {
  const res = await splitsApi.getGroup(id)
  return res.data
})

export const createGroup = apiThunk('splits/createGroup', async (data) => {
  const res = await splitsApi.createGroup(data)
  return res.data
})

export const fetchExpenses = apiThunk('splits/fetchExpenses', async (groupId) => {
  const res = await splitsApi.listExpenses({ group: groupId })
  return res.data.results || res.data
})

export const createExpense = apiThunk('splits/createExpense', async (data) => {
  const res = await splitsApi.createExpense(data)
  return res.data
})

export const deleteExpense = apiThunk('splits/deleteExpense', async (id) => {
  await splitsApi.deleteExpense(id)
  return id
})

export const fetchBalances = apiThunk('splits/fetchBalances', async (groupId) => {
  const res = await splitsApi.getBalances(groupId)
  return res.data
})

export const settle = apiThunk('splits/settle', async ({ groupId, data }) => {
  const res = await splitsApi.settle(groupId, data)
  return res.data
})

export const addMember = apiThunk('splits/addMember', async ({ groupId, data }) => {
  const res = await splitsApi.addMember(groupId, data)
  return res.data
})

const splitSlice = createSlice({
  name: 'splits',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.groups = action.payload
        state.loading = false
      })
      .addCase(fetchGroups.rejected, (state) => {
        state.loading = false
      })
      .addCase(fetchGroup.fulfilled, (state, action) => {
        state.currentGroup = action.payload
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.groups.push(action.payload)
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.expenses = action.payload
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.expenses.unshift(action.payload)
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter((e) => e.id !== action.payload)
      })
      .addCase(fetchBalances.fulfilled, (state, action) => {
        state.balances = action.payload
      })
      .addCase(addMember.fulfilled, (state, action) => {
        if (state.currentGroup) {
          state.currentGroup.members = [...(state.currentGroup.members || []), action.payload]
        }
      })
  },
})

export default splitSlice.reducer
