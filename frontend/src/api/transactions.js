import api from './axios'

export const transactionsApi = {
  list: (params) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.patch(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  dashboardSummary: () => api.get('/transactions/dashboard-summary'),

  // Tags
  listTags: () => api.get('/tags'),
  createTag: (data) => api.post('/tags', data),
  updateTag: (id, data) => api.patch(`/tags/${id}`, data),
  deleteTag: (id) => api.delete(`/tags/${id}`),
}
