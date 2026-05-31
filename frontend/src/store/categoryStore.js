import { create } from 'zustand'
import { categoriesApi } from '../api/categories'

export const useCategoryStore = create((set) => ({
  categories: [],
  budgets: [],
  loading: false,

  fetchCategories: async (params = {}) => {
    set({ loading: true })
    try {
      const res = await categoriesApi.list(params)
      set({ categories: res.data.results || res.data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createCategory: async (data) => {
    const res = await categoriesApi.create(data)
    set((s) => ({ categories: [...s.categories, res.data] }))
    return res.data
  },

  updateCategory: async (id, data) => {
    const res = await categoriesApi.update(id, data)
    set((s) => ({ categories: s.categories.map((c) => (c.id === id ? res.data : c)) }))
    return res.data
  },

  deleteCategory: async (id) => {
    await categoriesApi.delete(id)
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
  },

  fetchBudgets: async (params = {}) => {
    const res = await categoriesApi.listBudgets(params)
    set({ budgets: res.data.results || res.data })
  },

  fetchCurrentMonthBudgets: async () => {
    const res = await categoriesApi.currentMonthBudgets()
    set({ budgets: res.data })
  },

  createBudget: async (data) => {
    const res = await categoriesApi.createBudget(data)
    set((s) => ({ budgets: [...s.budgets, res.data] }))
    return res.data
  },

  updateBudget: async (id, data) => {
    const res = await categoriesApi.updateBudget(id, data)
    set((s) => ({ budgets: s.budgets.map((b) => (b.id === id ? res.data : b)) }))
    return res.data
  },

  deleteBudget: async (id) => {
    await categoriesApi.deleteBudget(id)
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }))
  },
}))
