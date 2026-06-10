// Bridges the camelCase Node/Express backend to the app's snake_case payloads.
// Outgoing request bodies/params are converted snake_case -> camelCase; incoming
// responses are converted camelCase -> snake_case. This lets the existing
// components keep using snake_case fields against the new backend unchanged.

const snakeToCamel = (key) => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
const camelToSnake = (key) => key.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)

// Values we must never recurse into (let them pass through untouched).
function isPlainContainer(value) {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return true
  if (typeof FormData !== 'undefined' && value instanceof FormData) return false
  if (typeof Blob !== 'undefined' && value instanceof Blob) return false
  if (typeof File !== 'undefined' && value instanceof File) return false
  if (value instanceof Date) return false
  // Only convert object literals.
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function convertKeys(value, transform) {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, transform))
  }
  if (!isPlainContainer(value)) return value

  const out = {}
  for (const [key, val] of Object.entries(value)) {
    out[transform(key)] = convertKeys(val, transform)
  }
  return out
}

export const keysToCamel = (value) => convertKeys(value, snakeToCamel)
export const keysToSnake = (value) => convertKeys(value, camelToSnake)
