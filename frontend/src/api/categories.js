import api from './axios'

export const categoriesApi = {
  list: (params) => api.get('/categories/', { params }),
  create: (data) => api.post('/categories/', data),
  update: (id, data) => api.patch(`/categories/${id}/`, data),
  delete: (id) => api.delete(`/categories/${id}/`),

  // Budgets
  listBudgets: (params) => api.get('/categories/budgets/', { params }),
  createBudget: (data) => api.post('/categories/budgets/', data),
  updateBudget: (id, data) => api.patch(`/categories/budgets/${id}/`, data),
  deleteBudget: (id) => api.delete(`/categories/budgets/${id}/`),
  currentMonthBudgets: () => api.get('/categories/budgets/current_month/'),
}
