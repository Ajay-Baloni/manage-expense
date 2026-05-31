import { create } from 'zustand'
import { transactionsApi } from '../api/transactions'

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  pagination: { count: 0, next: null, previous: null },
  filters: {
    type: '',
    category: '',
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: '',
    search: '',
    ordering: '-date',
    page: 1,
  },
  tags: [],
  summary: null,
  loading: false,

  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters, page: 1 } })),
  resetFilters: () => set({ filters: { type: '', category: '', date_from: '', date_to: '', amount_min: '', amount_max: '', search: '', ordering: '-date', page: 1 } }),

  fetchTransactions: async (extraParams = {}) => {
    set({ loading: true })
    try {
      const filters = get().filters
      const params = Object.fromEntries(
        Object.entries({ ...filters, ...extraParams }).filter(([_, v]) => v !== '' && v !== null)
      )
      const res = await transactionsApi.list(params)
      set({
        transactions: res.data.results || res.data,
        pagination: {
          count: res.data.count || 0,
          next: res.data.next,
          previous: res.data.previous,
        },
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  createTransaction: async (data) => {
    const res = await transactionsApi.create(data)
    set((s) => ({ transactions: [res.data, ...s.transactions] }))
    return res.data
  },

  updateTransaction: async (id, data) => {
    const res = await transactionsApi.update(id, data)
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
    }))
    return res.data
  },

  deleteTransaction: async (id) => {
    await transactionsApi.delete(id)
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
  },

  fetchTags: async () => {
    const res = await transactionsApi.listTags()
    set({ tags: res.data.results || res.data })
  },

  fetchSummary: async () => {
    const res = await transactionsApi.dashboardSummary()
    set({ summary: res.data })
    return res.data
  },
}))
