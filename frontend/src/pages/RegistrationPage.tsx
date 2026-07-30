import {useState, type ChangeEvent, type FormEvent} from 'react'
import {Link, Navigate, useNavigate} from 'react-router-dom'

import {
    getApiErrorMessage,
    getApiFieldErrors,
    type FieldErrors,
} from '../api/errors'
import {useAuth} from '../auth/useAuth'

interface RegistrationFormData {
    username: string
    email: string
    first_name: string
    last_name: string
    password: string
    password_confirm: string
}

type RegistrationField = keyof RegistrationFormData

const INITIAL_FORM_DATA: RegistrationFormData = {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
}

interface FieldErrorProps {
    id: string
    messages?: string[]
}

function FieldError({id, messages}: FieldErrorProps) {
    if (!messages?.length) {
        return null
    }

    return (
        <div id={id} className="invalid-feedback d-block">
            {messages.join(' ')}
        </div>
    )
}

export function RegistrationPage() {
    const {
        isAuthenticated,
        isInitializing,
        initializationError,
        register,
    } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] =
        useState<RegistrationFormData>(INITIAL_FORM_DATA)
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const field = event.target.name as RegistrationField
        const value = event.target.value

        setFormData((currentData) => ({
            ...currentData,
            [field]: value,
        }))

        setFieldErrors((currentErrors) => {
            if (!currentErrors[field]) {
                return currentErrors
            }

            const nextErrors = {...currentErrors}
            delete nextErrors[field]
            return nextErrors
        })

        setSubmitError(null)
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitError(null)
        setFieldErrors({})

        if (formData.password !== formData.password_confirm) {
            setFieldErrors({
                password_confirm: ['Passwords do not match.'],
            })
            return
        }

        setIsSubmitting(true)

        try {
            await register(formData)
            navigate('/dashboard', {replace: true})
        } catch (error) {
            const apiFieldErrors = getApiFieldErrors(error)
            setFieldErrors(apiFieldErrors)

            const generalMessages =
                apiFieldErrors.non_field_errors ?? apiFieldErrors.detail

            if (generalMessages?.[0]) {
                setSubmitError(generalMessages[0])
            } else if (Object.keys(apiFieldErrors).length === 0) {
                setSubmitError(
                    getApiErrorMessage(
                        error,
                        'Unable to create your account.',
                    ),
                )
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isInitializing) {
        return (
            <main className="container py-5">
                <p role="status">Checking your account...</p>
            </main>
        )
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace/>
    }

    return (
        <main className="container py-5">
            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-lg-6">
                    <div className="card shadow-sm">
                        <div className="card-body p-4">
                            <h1 className="h3 mb-3">Create account</h1>

                            <p className="text-secondary">
                                Create an account to write and manage your
                                posts.
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
                                        htmlFor="register-username"
                                    >
                                        Username
                                    </label>

                                    <input
                                        id="register-username"
                                        name="username"
                                        type="text"
                                        className={`form-control ${
                                            fieldErrors.username
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        value={formData.username}
                                        onChange={handleChange}
                                        autoComplete="username"
                                        aria-invalid={Boolean(
                                            fieldErrors.username,
                                        )}
                                        aria-describedby={
                                            fieldErrors.username
                                                ? 'register-username-error'
                                                : undefined
                                        }
                                        disabled={isSubmitting}
                                        required
                                    />

                                    <FieldError
                                        id="register-username-error"
                                        messages={fieldErrors.username}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label
                                        className="form-label"
                                        htmlFor="register-email"
                                    >
                                        Email
                                    </label>

                                    <input
                                        id="register-email"
                                        name="email"
                                        type="email"
                                        className={`form-control ${
                                            fieldErrors.email
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        value={formData.email}
                                        onChange={handleChange}
                                        autoComplete="email"
                                        aria-invalid={Boolean(
                                            fieldErrors.email,
                                        )}
                                        aria-describedby={
                                            fieldErrors.email
                                                ? 'register-email-error'
                                                : undefined
                                        }
                                        disabled={isSubmitting}
                                        required
                                    />

                                    <FieldError
                                        id="register-email-error"
                                        messages={fieldErrors.email}
                                    />
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label
                                            className="form-label"
                                            htmlFor="register-first-name"
                                        >
                                            First name
                                        </label>

                                        <input
                                            id="register-first-name"
                                            name="first_name"
                                            type="text"
                                            className={`form-control ${
                                                fieldErrors.first_name
                                                    ? 'is-invalid'
                                                    : ''
                                            }`}
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            autoComplete="given-name"
                                            aria-invalid={Boolean(
                                                fieldErrors.first_name,
                                            )}
                                            aria-describedby={
                                                fieldErrors.first_name
                                                    ? 'register-first-name-error'
                                                    : undefined
                                            }
                                            disabled={isSubmitting}
                                        />

                                        <FieldError
                                            id="register-first-name-error"
                                            messages={
                                                fieldErrors.first_name
                                            }
                                        />
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label
                                            className="form-label"
                                            htmlFor="register-last-name"
                                        >
                                            Last name
                                        </label>

                                        <input
                                            id="register-last-name"
                                            name="last_name"
                                            type="text"
                                            className={`form-control ${
                                                fieldErrors.last_name
                                                    ? 'is-invalid'
                                                    : ''
                                            }`}
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            autoComplete="family-name"
                                            aria-invalid={Boolean(
                                                fieldErrors.last_name,
                                            )}
                                            aria-describedby={
                                                fieldErrors.last_name
                                                    ? 'register-last-name-error'
                                                    : undefined
                                            }
                                            disabled={isSubmitting}
                                        />

                                        <FieldError
                                            id="register-last-name-error"
                                            messages={fieldErrors.last_name}
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label
                                        className="form-label"
                                        htmlFor="register-password"
                                    >
                                        Password
                                    </label>

                                    <input
                                        id="register-password"
                                        name="password"
                                        type="password"
                                        className={`form-control ${
                                            fieldErrors.password
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        aria-invalid={Boolean(
                                            fieldErrors.password,
                                        )}
                                        aria-describedby={
                                            fieldErrors.password
                                                ? 'register-password-error'
                                                : undefined
                                        }
                                        disabled={isSubmitting}
                                        required
                                    />

                                    <FieldError
                                        id="register-password-error"
                                        messages={fieldErrors.password}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label
                                        className="form-label"
                                        htmlFor="register-password-confirm"
                                    >
                                        Confirm password
                                    </label>

                                    <input
                                        id="register-password-confirm"
                                        name="password_confirm"
                                        type="password"
                                        className={`form-control ${
                                            fieldErrors.password_confirm
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        value={formData.password_confirm}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        aria-invalid={Boolean(
                                            fieldErrors.password_confirm,
                                        )}
                                        aria-describedby={
                                            fieldErrors.password_confirm
                                                ? 'register-password-confirm-error'
                                                : undefined
                                        }
                                        disabled={isSubmitting}
                                        required
                                    />

                                    <FieldError
                                        id="register-password-confirm-error"
                                        messages={
                                            fieldErrors.password_confirm
                                        }
                                    />
                                </div>

                                <button
                                    className="btn btn-primary w-100"
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? 'Creating account...'
                                        : 'Create account'}
                                </button>
                            </form>

                            <p className="text-center mt-3 mb-0">
                                Already have an account?{' '}
                                <Link to="/login">Sign in</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
