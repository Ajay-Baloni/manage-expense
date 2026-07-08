import api from './axios'

// Note: the axios interceptors convert outgoing snake_case -> camelCase and
// incoming camelCase -> snake_case, so callers use snake_case throughout
// (thread_id, interrupt_id, edited_args) and it reaches the backend camelCased.
export const assistantApi = {
  chat: (data) => api.post('/assistant/chat', data),
  confirm: (data) => api.post('/assistant/confirm', data),
}
