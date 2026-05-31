import api from './axios'

export const transactionsApi = {
  list: (params) => api.get('/transactions/', { params }),
  get: (id) => api.get(`/transactions/${id}/`),
  create: (data) => api.post('/transactions/', data),
  update: (id, data) => api.patch(`/transactions/${id}/`, data),
  delete: (id) => api.delete(`/transactions/${id}/`),
  dashboardSummary: () => api.get('/transactions/dashboard_summary/'),

  // Tags
  listTags: () => api.get('/transactions/tags/'),
  createTag: (data) => api.post('/transactions/tags/', data),
  updateTag: (id, data) => api.patch(`/transactions/tags/${id}/`, data),
  deleteTag: (id) => api.delete(`/transactions/tags/${id}/`),

  // Recurring
  listRecurring: () => api.get('/transactions/recurring/'),
  createRecurring: (data) => api.post('/transactions/recurring/', data),
  updateRecurring: (id, data) => api.patch(`/transactions/recurring/${id}/`, data),
  deleteRecurring: (id) => api.delete(`/transactions/recurring/${id}/`),
}
