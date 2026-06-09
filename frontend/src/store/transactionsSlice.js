import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { transactionsApi } from '../api/transactions'

const defaultFilters = {
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
  filters: { ...defaultFilters },
  tags: [],
  summary: null,
  loading: false,
  error: null,
}

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (extraParams = {}, { getState }) => {
    const filters = getState().transactions.filters
    const params = Object.fromEntries(
      Object.entries({ ...filters, ...extraParams }).filter(
        ([, v]) => v !== '' && v !== null
      )
    )
    const res = await transactionsApi.list(params)
    return res.data
  }
)

export const createTransaction = createAsyncThunk(
  'transactions/createTransaction',
  async (data) => {
    const res = await transactionsApi.create(data)
    return res.data
  }
)

export const updateTransaction = createAsyncThunk(
  'transactions/updateTransaction',
  async ({ id, data }) => {
    const res = await transactionsApi.update(id, data)
    return res.data
  }
)

export const deleteTransaction = createAsyncThunk(
  'transactions/deleteTransaction',
  async (id) => {
    await transactionsApi.delete(id)
    return id
  }
)

export const fetchTags = createAsyncThunk('transactions/fetchTags', async () => {
  const res = await transactionsApi.listTags()
  return res.data.results || res.data
})

export const fetchSummary = createAsyncThunk(
  'transactions/fetchSummary',
  async () => {
    const res = await transactionsApi.dashboardSummary()
    return res.data
  }
)

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      const incoming = action.payload || {}
      state.filters = {
        ...state.filters,
        ...incoming,
        page: incoming.page !== undefined ? incoming.page : 1,
      }
    },
    resetFilters: (state) => {
      state.filters = { ...defaultFilters }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        const data = action.payload
        state.transactions = data.results || data
        state.pagination = {
          count: data.count || 0,
          next: data.next ?? null,
          previous: data.previous ?? null,
        }
        state.loading = false
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || null
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.transactions = [action.payload, ...state.transactions]
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        state.transactions = state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        )
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.transactions = state.transactions.filter(
          (t) => t.id !== action.payload
        )
      })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.tags = action.payload
      })
      .addCase(fetchSummary.fulfilled, (state, action) => {
        state.summary = action.payload
      })
  },
})

export const { setFilters, resetFilters } = transactionsSlice.actions

export const selectTransactions = (state) => state.transactions

export default transactionsSlice.reducer
