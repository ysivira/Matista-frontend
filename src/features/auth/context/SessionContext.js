import { createContext } from 'react'

export const SESSION_STATUS = Object.freeze({
  CHECKING: 'checking',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
  ERROR: 'error',
})

export const SessionContext = createContext(null)
