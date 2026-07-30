import {
    useState,
    type FormEvent,
} from 'react'
import {
    Link,
    Navigate,
    useLocation,
    useNavigate,
} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {useAuth} from '../auth/useAuth'

interface LoginLocationState {
    from?: string
}

export function LoginPage() {
    const {
        isAuthenticated,
        isInitializing,
        initializationError,
        login,
    } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] =
        useState<string | null>(null)

    const locationState =
        location.state as LoginLocationState | null
    const destination =
        locationState?.from ?? '/dashboard'

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()
        setSubmitError(null)
        setIsSubmitting(true)

        try {
            await login({username, password})
            navigate(destination, {replace: true})
        } catch (error) {
            setSubmitError(
                getApiErrorMessage(error, 'Unable to log in.'),
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isInitializing) {
        return (
            <section
                className="container py-5 text-center"
                role="status"
            >
                Checking your session…
            </section>
        )
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace/>
    }

    return (
        <section className="container py-5">
            <div className="row justify-content-center">
                <div className="col-12 col-md-7 col-lg-5">
                    <div className="card shadow-sm">
                        <div className="card-body p-4">
                            <h1 className="h3 mb-3">Log in</h1>
                            <p className="text-secondary">
                                Continue to your ThoughtHub dashboard.
                            </p>

                            {initializationError && (
                                <div
                                    className="alert alert-warning"
                                    role="alert"
                                >
                                    {initializationError}
                                </div>
                            )}

                            {submitError && (
                                <div
                                    className="alert alert-danger"
                                    role="alert"
                                >
                                    {submitError}
                                </div>
                            )}

                            <form
                                onSubmit={handleSubmit}
                                aria-busy={isSubmitting}
                            >
                                <div className="mb-3">
                                    <label
                                        className="form-label"
                                        htmlFor="login-username"
                                    >
                                        Username
                                    </label>
                                    <input
                                        className="form-control"
                                        id="login-username"
                                        name="username"
                                        type="text"
                                        autoComplete="username"
                                        required
                                        disabled={isSubmitting}
                                        value={username}
                                        onChange={(event) => {
                                            setUsername(event.target.value)
                                        }}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label
                                        className="form-label"
                                        htmlFor="login-password"
                                    >
                                        Password
                                    </label>
                                    <input
                                        className="form-control"
                                        id="login-password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        disabled={isSubmitting}
                                        value={password}
                                        onChange={(event) => {
                                            setPassword(event.target.value)
                                        }}
                                    />
                                </div>

                                <button
                                    className="btn btn-primary w-100"
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Logging in…' : 'Log in'}
                                </button>
                            </form>

                            <p className="mt-3 mb-0 text-secondary">
                                Don’t have an account?{' '}
                                <Link to="/register">Create one</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}