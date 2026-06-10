import api from './axios'

export const categoriesApi = {
  list: (params) => api.get('/categories', { params }),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.patch(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),

  // Budgets
  listBudgets: (params) => api.get('/budgets', { params }),
  createBudget: (data) => api.post('/budgets', data),
  updateBudget: (id, data) => api.patch(`/budgets/${id}`, data),
  deleteBudget: (id) => api.delete(`/budgets/${id}`),
  currentMonthBudgets: () => api.get('/budgets/current-month'),
}
