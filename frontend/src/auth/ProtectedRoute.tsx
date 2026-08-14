import {
    Navigate,
    Outlet,
    useLocation,
} from 'react-router-dom'

import {useAuth} from './useAuth'

export function ProtectedRoute() {
    const {isAuthenticated, isInitializing} = useAuth()
    const location = useLocation()

    if (isInitializing) {
        return (
            <section
                className="app-shell system-loading-state"
                role="status"
            >
                <span className="loading-ring" aria-hidden="true"/>
                <p>Checking your session…</p>
            </section>
        )
    }

    if (!isAuthenticated) {
        const requestedPath = `${location.pathname}${location.search}${location.hash}`

        return (
            <Navigate
                to="/login"
                replace
                state={{from: requestedPath}}
            />
        )
    }
    return <Outlet/>
}
