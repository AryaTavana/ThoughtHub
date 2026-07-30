import {
    Link,
    Route,
    Routes,
} from 'react-router-dom'

import './App.css'

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

function LoginPage() {
    return <h1>Log in</h1>
}

function RegistrationPage() {
    return <h1>Create account</h1>
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
                <Route
                    path="/dashboard"
                    element={<DashboardPage/>}
                />
                <Route path="*" element={<NotFoundPage/>}/>
            </Routes>
        </main>
    )
}

export default App