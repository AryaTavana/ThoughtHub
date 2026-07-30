import {
    Link,
    Route,
    Routes,
} from 'react-router-dom'

import './App.css'
import {LoginPage} from './pages/LoginPage'
import {RegistrationPage} from './pages/RegistrationPage'
import {ProtectedRoute} from './auth/ProtectedRoute'
import {AppNavbar} from './components/AppNavbar'

function HomePage() {
    return (
        <section className="container py-5">
            <h1>ThoughtHub</h1>
            <p className="text-secondary">
                Discover ideas and stories from our community.
            </p>
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
        <div className="app d-flex flex-column">
            <AppNavbar/>
            <main className="flex-grow-1">
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
        </div>
    )
}

export default App
