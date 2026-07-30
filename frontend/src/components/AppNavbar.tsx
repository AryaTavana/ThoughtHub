import {useState} from 'react'
import {
    Link,
    NavLink,
    useNavigate,
} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {useAuth} from '../auth/useAuth'

export function AppNavbar() {
    const {
        user,
        isAuthenticated,
        isInitializing,
        logout,
    } = useAuth()
    const navigate = useNavigate()

    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [logoutError, setLogoutError] =
        useState<string | null>(null)

    const displayName =
        user?.first_name.trim() || user?.username

    async function handleLogout() {
        setLogoutError(null)
        setIsLoggingOut(true)

        try {
            await logout()
            navigate('/', {replace: true})
        } catch (error) {
            setLogoutError(
                getApiErrorMessage(error, 'Unable to log out.'),
            )
        } finally {
            setIsLoggingOut(false)
        }
    }

    return (
        <header>
            <nav
                className="navbar navbar-expand-md bg-body-tertiary border-bottom"
                aria-label="Primary navigation"
            >
                <div className="container">
                    <Link className="navbar-brand fw-bold" to="/">
                        ThoughtHub
                    </Link>

                    <button
                        className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#primary-navigation"
                        aria-controls="primary-navigation"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"/>
                    </button>

                    <div
                        id="primary-navigation"
                        className="collapse navbar-collapse"
                    >
                        <ul className="navbar-nav me-auto mb-2 mb-md-0">
                            <li className="nav-item">
                                <NavLink
                                    className={({isActive}) =>
                                        `nav-link ${
                                            isActive ? 'active' : ''
                                        }`
                                    }
                                    to="/"
                                    end
                                >
                                    Home
                                </NavLink>
                            </li>

                            {isAuthenticated && (
                                <li className="nav-item">
                                    <NavLink
                                        className={({isActive}) =>
                                            `nav-link ${
                                                isActive ? 'active' : ''
                                            }`
                                        }
                                        to="/dashboard"
                                    >
                                        Dashboard
                                    </NavLink>
                                </li>
                            )}
                        </ul>

                        {isInitializing ? (
                            <span
                                className="navbar-text"
                                role="status"
                            >
                                Checking session…
                            </span>
                        ) : isAuthenticated && user ? (
                            <div className="d-flex align-items-center gap-3">
                                <span className="navbar-text">
                                    Signed in as{' '}
                                    <strong>{displayName}</strong>
                                </span>

                                <button
                                    className="btn btn-outline-danger btn-sm"
                                    type="button"
                                    disabled={isLoggingOut}
                                    onClick={() => {
                                        void handleLogout()
                                    }}
                                >
                                    {isLoggingOut
                                        ? 'Logging out…'
                                        : 'Log out'}
                                </button>
                            </div>
                        ) : (
                            <div className="d-flex gap-2">
                                <Link
                                    className="btn btn-outline-primary btn-sm"
                                    to="/login"
                                >
                                    Log in
                                </Link>

                                <Link
                                    className="btn btn-primary btn-sm"
                                    to="/register"
                                >
                                    Create account
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {logoutError && (
                <div className="container pt-3">
                    <div
                        className="alert alert-danger mb-0"
                        role="alert"
                    >
                        {logoutError}
                    </div>
                </div>
            )}
        </header>
    )
}
