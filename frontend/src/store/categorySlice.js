import { createSlice } from '@reduxjs/toolkit'
import { categoriesApi } from '../api/categories'
import { apiThunk } from './thunkUtils'

const initialState = {
  categories: [],
  budgets: [],
  loading: false,
}

export const fetchCategories = apiThunk('categories/fetch', async (params = {}) => {
  const res = await categoriesApi.list(params)
  return res.data.results || res.data
})

export const createCategory = apiThunk('categories/create', async (data) => {
  const res = await categoriesApi.create(data)
  return res.data
})

export const updateCategory = apiThunk('categories/update', async ({ id, data }) => {
  const res = await categoriesApi.update(id, data)
  return res.data
})

export const deleteCategory = apiThunk('categories/delete', async (id) => {
  await categoriesApi.delete(id)
  return id
})

export const fetchBudgets = apiThunk('budgets/fetch', async (params = {}) => {
  const res = await categoriesApi.listBudgets(params)
  return res.data.results || res.data
})

export const fetchCurrentMonthBudgets = apiThunk('budgets/fetchCurrentMonth', async () => {
  const res = await categoriesApi.currentMonthBudgets()
  return res.data
})

export const createBudget = apiThunk('budgets/create', async (data) => {
  const res = await categoriesApi.createBudget(data)
  return res.data
})

export const updateBudget = apiThunk('budgets/update', async ({ id, data }) => {
  const res = await categoriesApi.updateBudget(id, data)
  return res.data
})

export const deleteBudget = apiThunk('budgets/delete', async (id) => {
  await categoriesApi.deleteBudget(id)
  return id
})

const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload
        state.loading = false
      })
      .addCase(fetchCategories.rejected, (state) => {
        state.loading = false
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload)
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.categories = state.categories.map((c) => (c.id === action.payload.id ? action.payload : c))
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter((c) => c.id !== action.payload)
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.budgets = action.payload
      })
      .addCase(fetchCurrentMonthBudgets.fulfilled, (state, action) => {
        state.budgets = action.payload
      })
      .addCase(createBudget.fulfilled, (state, action) => {
        state.budgets.push(action.payload)
      })
      .addCase(updateBudget.fulfilled, (state, action) => {
        state.budgets = state.budgets.map((b) => (b.id === action.payload.id ? action.payload : b))
      })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.budgets = state.budgets.filter((b) => b.id !== action.payload)
      })
  },
})

export default categorySlice.reducer
