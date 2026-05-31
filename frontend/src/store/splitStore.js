import { create } from 'zustand'
import { splitsApi } from '../api/splits'

export const useSplitStore = create((set) => ({
  groups: [],
  currentGroup: null,
  expenses: [],
  balances: null,
  loading: false,

  fetchGroups: async () => {
    set({ loading: true })
    try {
      const res = await splitsApi.listGroups()
      set({ groups: res.data.results || res.data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchGroup: async (id) => {
    const res = await splitsApi.getGroup(id)
    set({ currentGroup: res.data })
    return res.data
  },

  createGroup: async (data) => {
    const res = await splitsApi.createGroup(data)
    set((s) => ({ groups: [...s.groups, res.data] }))
    return res.data
  },

  fetchExpenses: async (groupId) => {
    const res = await splitsApi.listExpenses({ group: groupId })
    set({ expenses: res.data.results || res.data })
  },

  createExpense: async (data) => {
    const res = await splitsApi.createExpense(data)
    set((s) => ({ expenses: [res.data, ...s.expenses] }))
    return res.data
  },

  deleteExpense: async (id) => {
    await splitsApi.deleteExpense(id)
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }))
  },

  fetchBalances: async (groupId) => {
    const res = await splitsApi.getBalances(groupId)
    set({ balances: res.data })
    return res.data
  },

  settle: async (groupId, data) => {
    const res = await splitsApi.settle(groupId, data)
    return res.data
  },

  addMember: async (groupId, data) => {
    const res = await splitsApi.addMember(groupId, data)
    set((s) => ({
      currentGroup: s.currentGroup
        ? { ...s.currentGroup, members: [...s.currentGroup.members, res.data] }
        : s.currentGroup,
    }))
    return res.data
  },
}))
