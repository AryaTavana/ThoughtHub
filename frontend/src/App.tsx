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
import {PublicPostsPage} from './pages/PublicPostsPage'
import {PublicPostDetailPage} from './pages/PublicPostDetailPage'
import {DashboardPage} from './pages/DashboardPage'

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
                    <Route path="/" element={<PublicPostsPage/>}/>
                    <Route
                        path="/posts/:slug"
                        element={<PublicPostDetailPage/>}
                    />
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
