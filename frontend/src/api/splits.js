import api from './axios'

export const splitsApi = {
  listGroups: () => api.get('/splits/groups/'),
  getGroup: (id) => api.get(`/splits/groups/${id}/`),
  createGroup: (data) => api.post('/splits/groups/', data),
  updateGroup: (id, data) => api.patch(`/splits/groups/${id}/`, data),
  deleteGroup: (id) => api.delete(`/splits/groups/${id}/`),
  addMember: (id, data) => api.post(`/splits/groups/${id}/add_member/`, data),
  getBalances: (id) => api.get(`/splits/groups/${id}/balances/`),
  settle: (id, data) => api.post(`/splits/groups/${id}/settle/`, data),

  listExpenses: (params) => api.get('/splits/expenses/', { params }),
  createExpense: (data) => api.post('/splits/expenses/', data),
  updateExpense: (id, data) => api.patch(`/splits/expenses/${id}/`, data),
  deleteExpense: (id) => api.delete(`/splits/expenses/${id}/`),
}
