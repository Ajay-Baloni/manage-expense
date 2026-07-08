import { createSlice, nanoid } from '@reduxjs/toolkit'
import { assistantApi } from '../api/assistant'
import { apiThunk } from './thunkUtils'

const initialState = {
  open: false,
  threadId: null,
  // { id, role: 'user' | 'assistant', text }
  messages: [],
  // { interruptId, action, proposed } — a write awaiting user confirmation
  pending: null,
  loading: false,
}

export const sendMessage = apiThunk('assistant/send', async (text, { getState }) => {
  const { threadId } = getState().assistant
  const res = await assistantApi.chat({ message: text, thread_id: threadId ?? undefined })
  return res.data
})

export const resolveConfirmation = apiThunk(
  'assistant/confirm',
  async ({ decision, editedArgs }, { getState }) => {
    const { threadId, pending } = getState().assistant
    const res = await assistantApi.confirm({
      thread_id: threadId,
      decision,
      edited_args: editedArgs,
      interrupt_id: pending?.interruptId,
    })
    return res.data
  },
)

// Both thunks resolve to the same response shape (already snake_cased by axios):
// { thread_id, status: 'done' | 'confirm_required', reply?, interrupt_id?, pending? }
function applyResponse(state, payload) {
  state.threadId = payload.thread_id
  if (payload.status === 'confirm_required') {
    state.pending = {
      interruptId: payload.interrupt_id,
      action: payload.pending?.action,
      proposed: payload.pending?.proposed ?? {},
    }
  } else {
    state.pending = null
    state.messages.push({ id: nanoid(), role: 'assistant', text: payload.reply || '' })
  }
}

const assistantSlice = createSlice({
  name: 'assistant',
  initialState,
  reducers: {
    toggleAssistant: (state) => {
      state.open = !state.open
    },
    closeAssistant: (state) => {
      state.open = false
    },
    resetConversation: (state) => {
      state.threadId = null
      state.messages = []
      state.pending = null
      state.loading = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state, action) => {
        state.loading = true
        state.messages.push({ id: nanoid(), role: 'user', text: action.meta.arg })
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false
        applyResponse(state, action.payload)
      })
      .addCase(sendMessage.rejected, (state) => {
        state.loading = false
      })
      .addCase(resolveConfirmation.pending, (state) => {
        state.loading = true
      })
      .addCase(resolveConfirmation.fulfilled, (state, action) => {
        state.loading = false
        applyResponse(state, action.payload)
      })
      .addCase(resolveConfirmation.rejected, (state) => {
        state.loading = false
        // The pending card stays visible so the user can retry or cancel.
      })
  },
})

export const { toggleAssistant, closeAssistant, resetConversation } = assistantSlice.actions
export default assistantSlice.reducer
