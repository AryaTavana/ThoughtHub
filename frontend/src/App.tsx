import {
    lazy,
    Suspense,
} from 'react'
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

const loadCommunityPages = () => import('./pages/CommunityPages')
const CategoriesTagsPage = lazy(async () => ({
    default: (await loadCommunityPages()).CategoriesTagsPage,
}))
const CategoryPage = lazy(async () => ({
    default: (await loadCommunityPages()).CategoryPage,
}))
const CommunityGuidelinesPage = lazy(async () => ({
    default: (await loadCommunityPages()).CommunityGuidelinesPage,
}))
const HelpCenterPage = lazy(async () => ({
    default: (await loadCommunityPages()).HelpCenterPage,
}))
const ModerationPage = lazy(async () => ({
    default: (await loadCommunityPages()).ModerationPage,
}))
const NotificationsPage = lazy(async () => ({
    default: (await loadCommunityPages()).NotificationsPage,
}))
const OfflineStatePage = lazy(async () => ({
    default: (await loadCommunityPages()).OfflineStatePage,
}))
const PasswordRecoveryPage = lazy(async () => ({
    default: (await loadCommunityPages()).PasswordRecoveryPage,
}))
const PublicProfilePage = lazy(async () => ({
    default: (await loadCommunityPages()).PublicProfilePage,
}))
const RemovedPostPage = lazy(async () => ({
    default: (await loadCommunityPages()).RemovedPostPage,
}))
const SavedPostsPage = lazy(async () => ({
    default: (await loadCommunityPages()).SavedPostsPage,
}))
const SearchPage = lazy(async () => ({
    default: (await loadCommunityPages()).SearchPage,
}))
const SettingsPage = lazy(async () => ({
    default: (await loadCommunityPages()).SettingsPage,
}))
const TagPage = lazy(async () => ({
    default: (await loadCommunityPages()).TagPage,
}))

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
            <a className="skip-link" href="#main-content">Skip to main content</a>
            <AppNavbar/>
            <main id="main-content" tabIndex={-1}>
                <Suspense fallback={<section className="app-shell community-page"><div className="content-state" role="status"><span className="loading-ring" aria-hidden="true"/><p>Loading page…</p></div></section>}>
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
                        path="/password-recovery/:uid/:token"
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
                    <Route path="/categories" element={<CategoriesTagsPage/>}/>
                    <Route path="/categories/:category" element={<CategoryPage/>}/>
                    <Route path="/tags/:tag" element={<TagPage/>}/>
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
                </Suspense>
            </main>
            <SiteFooter/>
        </div>
    )
}

export default App
