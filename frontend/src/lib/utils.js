import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// Compact form for chart axes, e.g. ₹1.2k, $3.4M
export function formatCompactCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

// Just the currency symbol for the active currency, e.g. ₹, $, €
export function currencySymbol(currency = 'INR') {
  const parts = new Intl.NumberFormat('en-IN', { style: 'currency', currency }).formatToParts(0)
  return parts.find((p) => p.type === 'currency')?.value || ''
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateInput(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

export function getErrorMessage(error) {
  if (error?.response?.data) {
    const data = error.response.data
    if (typeof data === 'string') return data
    if (data.detail) return data.detail
    const msgs = Object.entries(data)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('; ')
    return msgs || 'An error occurred'
  }
  return error?.message || 'An error occurred'
}
