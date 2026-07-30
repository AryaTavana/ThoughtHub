import {createContext} from 'react'

import type {
    CurrentUser,
    LoginCredentials,
    RegistrationData,
} from '../api/auth'

export interface AuthContextValue {
    user: CurrentUser | null
    isAuthenticated: boolean
    isInitializing: boolean
    initializationError: string | null
    login: (credentials: LoginCredentials) => Promise<CurrentUser>
    register: (
        registrationData: RegistrationData,
    ) => Promise<CurrentUser>
    logout: () => Promise<void>
}

export const AuthContext = createContext<
    AuthContextValue | undefined
>(undefined)