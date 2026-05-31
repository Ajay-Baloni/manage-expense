import api from './axios'

export const reportsApi = {
  importCSV: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/reports/import/csv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  exportCSV: (params) =>
    api.get('/reports/export/csv/', {
      params,
      responseType: 'blob',
    }),
  exportPDF: (params) =>
    api.get('/reports/export/pdf/', {
      params,
      responseType: 'blob',
    }),
  listImportJobs: () => api.get('/reports/import/jobs/'),
}
