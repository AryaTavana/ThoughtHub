import {
    Link,
    Route,
    Routes,
} from 'react-router-dom'

import './App.css'
import {LoginPage} from './pages/LoginPage'
import {RegistrationPage} from './pages/RegistrationPage'
import {ProtectedRoute} from './auth/ProtectedRoute'

function HomePage() {
    return (
        <section>
            <h1>ThoughtHub</h1>
            <nav aria-label="Main navigation">
                <Link to="/login">Log in</Link>{' '}
                <Link to="/register">Create account</Link>{' '}
                <Link to="/dashboard">Dashboard</Link>
            </nav>
        </section>
    )
}

function DashboardPage() {
    return <h1>Dashboard</h1>
}

function NotFoundPage() {
    return (
        <section>
            <h1>Page not found</h1>
            <Link to="/">Return home</Link>
        </section>
    )
}

function App() {
    return (
        <main className="app">
            <Routes>
                <Route path="/" element={<HomePage/>}/>
                <Route path="/login" element={<LoginPage/>}/>
                <Route
                    path="/register"
                    element={<RegistrationPage/>}
                />
                <Route element={<ProtectedRoute/>}>
                    <Route
                        path="/dashboard"
                        element={<DashboardPage/>}
                    />
                </Route>
                <Route path="*" element={<NotFoundPage/>}/>
            </Routes>
        </main>
    )
}

export default App