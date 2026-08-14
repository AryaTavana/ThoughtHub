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
import {PostEditorPage} from './pages/PostEditorPage'
import {SiteFooter} from './components/SiteFooter'
import {
    CommunityGuidelinesPage,
    HelpCenterPage,
    ModerationPage,
    NotificationsPage,
    OfflineStatePage,
    PasswordRecoveryPage,
    PublicProfilePage,
    RemovedPostPage,
    SavedPostsPage,
    SearchPage,
    SettingsPage,
    TopicPage,
} from './pages/CommunityPages'

function NotFoundPage() {
    return (
        <section className="system-state-page app-shell">
            <div className="system-state-page__code" aria-hidden="true">404</div>
            <div className="system-state-page__mark" aria-hidden="true">?</div>
            <p className="section-eyebrow">Page not found</p>
            <h1>Page not found</h1>
            <p>This idea may have moved, the link may be old, or the post may no longer be public.</p>
            <div className="system-state-page__actions">
                <Link className="button button--primary" to="/">Return home</Link>
                <Link className="button button--secondary" to="/search">Search ThoughtHub</Link>
            </div>
        </section>
    )
}

function App() {
    return (
        <div className="app">
            <AppNavbar/>
            <main>
                <Routes>
                    <Route path="/" element={<PublicPostsPage/>}/>
                    <Route
                        path="/posts/:slug"
                        element={<PublicPostDetailPage/>}
                    />
                    <Route path="/login" element={<LoginPage/>}/>
                    <Route
                        path="/password-recovery"
                        element={<PasswordRecoveryPage/>}
                    />
                    <Route
                        path="/register"
                        element={<RegistrationPage/>}
                    />
                    <Route
                        path="/profile/:username"
                        element={<PublicProfilePage/>}
                    />
                    <Route path="/search" element={<SearchPage/>}/>
                    <Route path="/topics/:topic" element={<TopicPage/>}/>
                    <Route
                        path="/guidelines"
                        element={<CommunityGuidelinesPage/>}
                    />
                    <Route path="/help" element={<HelpCenterPage/>}/>
                    <Route path="/offline" element={<OfflineStatePage/>}/>
                    <Route element={<ProtectedRoute/>}>
                        <Route
                            path="/dashboard"
                            element={<DashboardPage/>}
                        />
                        <Route
                            path="/dashboard/posts/new"
                            element={<PostEditorPage/>}
                        />
                        <Route
                            path="/dashboard/posts/:postId/edit"
                            element={<PostEditorPage/>}
                        />
                        <Route
                            path="/dashboard/posts/:postId/removed"
                            element={<RemovedPostPage/>}
                        />
                        <Route path="/saved" element={<SavedPostsPage/>}/>
                        <Route path="/notifications" element={<NotificationsPage/>}/>
                        <Route path="/settings" element={<SettingsPage/>}/>
                        <Route path="/moderation" element={<ModerationPage/>}/>
                    </Route>
                    <Route path="*" element={<NotFoundPage/>}/>
                </Routes>
            </main>
            <SiteFooter/>
        </div>
    )
}

export default App
