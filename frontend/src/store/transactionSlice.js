import { createSlice } from '@reduxjs/toolkit'
import { transactionsApi } from '../api/transactions'
import { apiThunk } from './thunkUtils'

const emptyFilters = {
  type: '',
  category: '',
  date_from: '',
  date_to: '',
  amount_min: '',
  amount_max: '',
  search: '',
  ordering: '-date',
  page: 1,
}

const initialState = {
  transactions: [],
  pagination: { count: 0, next: null, previous: null },
  filters: { ...emptyFilters },
  summary: null,
  loading: false,
}

export const fetchTransactions = apiThunk('transactions/fetch', async (extraParams = {}, { getState }) => {
  const { filters } = getState().transactions
  const params = Object.fromEntries(
    Object.entries({ ...filters, ...extraParams }).filter(([, v]) => v !== '' && v !== null),
  )
  const res = await transactionsApi.list(params)
  return {
    transactions: res.data.results || res.data,
    pagination: {
      count: res.data.count || 0,
      next: res.data.next ?? null,
      previous: res.data.previous ?? null,
    },
  }
})

export const createTransaction = apiThunk('transactions/create', async (data) => {
  const res = await transactionsApi.create(data)
  return res.data
})

export const updateTransaction = apiThunk('transactions/update', async ({ id, data }) => {
  const res = await transactionsApi.update(id, data)
  return res.data
})

export const deleteTransaction = apiThunk('transactions/delete', async (id) => {
  await transactionsApi.delete(id)
  return id
})

export const fetchSummary = apiThunk('transactions/summary', async () => {
  const res = await transactionsApi.dashboardSummary()
  return res.data
})

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload, page: 1 }
    },
    resetFilters: (state) => {
      state.filters = { ...emptyFilters }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload.transactions
        state.pagination = action.payload.pagination
        state.loading = false
      })
      .addCase(fetchTransactions.rejected, (state) => {
        state.loading = false
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.transactions.unshift(action.payload)
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        state.transactions = state.transactions.map((t) => (t.id === action.payload.id ? action.payload : t))
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.transactions = state.transactions.filter((t) => t.id !== action.payload)
      })
      .addCase(fetchSummary.fulfilled, (state, action) => {
        state.summary = action.payload
      })
  },
})

export const { setFilters, resetFilters } = transactionSlice.actions
export default transactionSlice.reducer
