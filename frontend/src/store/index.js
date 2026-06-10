import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

import authReducer from './authSlice'
import uiReducer from './uiSlice'
import categoryReducer from './categorySlice'
import transactionReducer from './transactionSlice'
import splitReducer from './splitSlice'

// Persist auth (session) and ui (theme/sidebar) only — data slices refetch.
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'accessToken', 'refreshToken', 'isAuthenticated'],
}
const uiPersistConfig = {
  key: 'ui',
  storage,
  whitelist: ['theme', 'sidebarOpen'],
}

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  ui: persistReducer(uiPersistConfig, uiReducer),
  categories: categoryReducer,
  transactions: transactionReducer,
  splits: splitReducer,
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches these non-serializable action types.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)
