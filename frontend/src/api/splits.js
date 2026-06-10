import api from './axios'

export const splitsApi = {
  listGroups: () => api.get('/split-groups'),
  getGroup: (id) => api.get(`/split-groups/${id}`),
  createGroup: (data) => api.post('/split-groups', data),
  updateGroup: (id, data) => api.patch(`/split-groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/split-groups/${id}`),
  addMember: (id, data) => api.post(`/split-groups/${id}/members`, data),
  getBalances: (id) => api.get(`/split-groups/${id}/balances`),
  settle: (id, data) => api.post(`/split-groups/${id}/settle`, data),

  listExpenses: (params) => api.get('/split-expenses', { params }),
  createExpense: (data) => api.post('/split-expenses', data),
  deleteExpense: (id) => api.delete(`/split-expenses/${id}`),
}
