import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { categoriesApi } from '../api/categories'

const initialState = {
  categories: [],
  budgets: [],
  loading: false,
  error: null,
}

export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (params = {}) => {
    const res = await categoriesApi.list(params)
    return res.data.results || res.data
  }
)

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (data) => {
    const res = await categoriesApi.create(data)
    return res.data
  }
)

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, data }) => {
    const res = await categoriesApi.update(id, data)
    return res.data
  }
)

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id) => {
    await categoriesApi.delete(id)
    return id
  }
)

export const fetchBudgets = createAsyncThunk(
  'categories/fetchBudgets',
  async (params = {}) => {
    const res = await categoriesApi.listBudgets(params)
    return res.data.results || res.data
  }
)

export const fetchCurrentMonthBudgets = createAsyncThunk(
  'categories/fetchCurrentMonthBudgets',
  async () => {
    const res = await categoriesApi.currentMonthBudgets()
    return res.data
  }
)

export const createBudget = createAsyncThunk(
  'categories/createBudget',
  async (data) => {
    const res = await categoriesApi.createBudget(data)
    return res.data
  }
)

export const updateBudget = createAsyncThunk(
  'categories/updateBudget',
  async ({ id, data }) => {
    const res = await categoriesApi.updateBudget(id, data)
    return res.data
  }
)

export const deleteBudget = createAsyncThunk(
  'categories/deleteBudget',
  async (id) => {
    await categoriesApi.deleteBudget(id)
    return id
  }
)

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload
        state.loading = false
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || null
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories = [...state.categories, action.payload]
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.categories = state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c
        )
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter(
          (c) => c.id !== action.payload
        )
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.budgets = action.payload
      })
      .addCase(fetchCurrentMonthBudgets.fulfilled, (state, action) => {
        state.budgets = action.payload
      })
      .addCase(createBudget.fulfilled, (state, action) => {
        state.budgets = [...state.budgets, action.payload]
      })
      .addCase(updateBudget.fulfilled, (state, action) => {
        state.budgets = state.budgets.map((b) =>
          b.id === action.payload.id ? action.payload : b
        )
      })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.budgets = state.budgets.filter((b) => b.id !== action.payload)
      })
  },
})

export const selectCategories = (state) => state.categories

export default categoriesSlice.reducer
