import {
    useEffect,
    useState,
    type ReactNode,
} from 'react'

import {
    getCurrentUser,
    initializeCsrf,
    login as loginRequest,
    logout as logoutRequest,
    register as registerRequest,
    type CurrentUser,
    type LoginCredentials,
    type RegistrationData,
} from '../api/auth'
import {ApiError} from '../api/client'
import {
    AuthContext,
    type AuthContextValue,
} from './auth-context'

interface AuthProviderProps {
    children: ReactNode
}

function getInitializationErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return 'Unable to initialize authentication.'
}

function isSignedOutResponse(error: unknown): boolean {
    return (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
    )
}

export function AuthProvider({children}: AuthProviderProps) {
    const [user, setUser] = useState<CurrentUser | null>(null)
    const [isInitializing, setIsInitializing] = useState(true)
    const [initializationError, setInitializationError] =
        useState<string | null>(null)

    useEffect(() => {
        let isCancelled = false

        async function initializeAuthentication() {
            try {
                await initializeCsrf()

                try {
                    const currentUser = await getCurrentUser()

                    if (!isCancelled) {
                        setUser(currentUser)
                    }
                } catch (error) {
                    if (!isSignedOutResponse(error)) {
                        throw error
                    }

                    if (!isCancelled) {
                        setUser(null)
                    }
                }
            } catch (error) {
                if (!isCancelled) {
                    setInitializationError(
                        getInitializationErrorMessage(error),
                    )
                }
            } finally {
                if (!isCancelled) {
                    setIsInitializing(false)
                }
            }
        }

        void initializeAuthentication()

        return () => {
            isCancelled = true
        }
    }, [])

    async function login(
        credentials: LoginCredentials,
    ): Promise<CurrentUser> {
        const authenticatedUser = await loginRequest(credentials)

        setUser(authenticatedUser)
        setInitializationError(null)
        return authenticatedUser
    }

    async function register(
        registrationData: RegistrationData,
    ): Promise<CurrentUser> {
        const registeredUser = await registerRequest(registrationData)

        setUser(registeredUser)
        setInitializationError(null)
        return registeredUser
    }

    async function logout(): Promise<void> {
        await logoutRequest()
        setUser(null)
    }

    const contextValue: AuthContextValue = {
        user,
        isAuthenticated: user !== null,
        isInitializing,
        initializationError,
        login,
        register,
        logout,
    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
}