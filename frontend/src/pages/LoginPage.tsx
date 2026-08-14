import {Icon} from '@iconify/react'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import compassIcon from '@iconify-icons/lucide/compass'
import eyeIcon from '@iconify-icons/lucide/eye'
import eyeOffIcon from '@iconify-icons/lucide/eye-off'
import graduationCapIcon from '@iconify-icons/lucide/graduation-cap'
import lockIcon from '@iconify-icons/lucide/lock-keyhole'
import messagesIcon from '@iconify-icons/lucide/messages-square'
import penLineIcon from '@iconify-icons/lucide/pen-line'
import userIcon from '@iconify-icons/lucide/user'
import {useState, type FormEvent} from 'react'
import {Link, Navigate, useLocation, useNavigate} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {useAuth} from '../auth/useAuth'

interface LoginLocationState {
    from?: string
}

export function LoginPage() {
    const {isAuthenticated, isInitializing, initializationError, login} = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const locationState = location.state as LoginLocationState | null
    const destination = locationState?.from ?? '/dashboard'

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitError(null)
        setIsSubmitting(true)

        try {
            await login({username, password})
            navigate(destination, {replace: true})
        } catch (error) {
            setSubmitError(getApiErrorMessage(error, 'Unable to log in.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isInitializing) {
        return <section className="content-state app-shell" role="status"><span className="loading-ring" aria-hidden="true"/><p>Checking your session…</p></section>
    }

    if (isAuthenticated) return <Navigate to="/dashboard" replace/>

    return (
        <section className="auth-page app-shell">
            <aside className="auth-welcome">
                <div>
                    <p className="section-eyebrow">Welcome back</p>
                    <p className="auth-welcome__heading">Your next idea is waiting.</p>
                    <p>Sign in to keep writing, discover new perspectives, and join conversations across your university community.</p>
                </div>
                <div className="auth-benefit-list">
                    <div><span><Icon icon={compassIcon} aria-hidden="true"/></span><div><strong>Discover student perspectives</strong><p>Explore the newest writing from your community.</p></div></div>
                    <div><span><Icon icon={penLineIcon} aria-hidden="true"/></span><div><strong>Continue where you stopped</strong><p>Return to drafts and publish when ready.</p></div></div>
                    <div><span><Icon icon={messagesIcon} aria-hidden="true"/></span><div><strong>Join the conversation</strong><p>Share thoughts through meaningful comments.</p></div></div>
                </div>
                <p className="auth-student-note"><Icon icon={graduationCapIcon} aria-hidden="true"/>Made for curious university minds.</p>
            </aside>

            <div className="auth-card">
                <header><p className="section-eyebrow auth-card__eyebrow">Welcome back</p><h1>Log in</h1><p>Enter your details to continue to ThoughtHub.</p></header>

                {initializationError && <div className="app-alert app-alert--warning" role="alert">{initializationError}</div>}
                {submitError && <div className="app-alert app-alert--danger" role="alert">{submitError}</div>}

                <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
                    <div className="field">
                        <label htmlFor="login-username">Username</label>
                        <div className="field-control"><Icon icon={userIcon} aria-hidden="true"/><input id="login-username" name="username" type="text" autoComplete="username" required disabled={isSubmitting} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username"/></div>
                    </div>

                    <div className="field">
                        <div className="field-label-row"><label htmlFor="login-password">Password</label><Link to="/password-recovery">Forgot password?</Link></div>
                        <div className="field-control"><Icon icon={lockIcon} aria-hidden="true"/><input id="login-password" name="password" type={isPasswordVisible ? 'text' : 'password'} autoComplete="current-password" required disabled={isSubmitting} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password"/><button type="button" aria-label={isPasswordVisible ? 'Hide password' : 'Show password'} onClick={() => setIsPasswordVisible((value) => !value)}><Icon icon={isPasswordVisible ? eyeOffIcon : eyeIcon} aria-hidden="true"/><span>{isPasswordVisible ? 'Hide' : 'Show'}</span></button></div>
                    </div>

                    <button className="button button--primary button--block" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in…' : 'Log in'}{!isSubmitting && <Icon icon={arrowRightIcon} aria-hidden="true"/>}</button>
                </form>

                <div className="auth-divider"><span>New to ThoughtHub?</span></div>
                <p className="auth-register-link">Don’t have an account? <Link to="/register">Create one</Link></p>
            </div>
        </section>
    )
}
