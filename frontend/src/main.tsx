import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import './index.css'
import App from './App.tsx'
import {initializeTheme} from './theme.ts'
import {AuthProvider} from './auth/AuthProvider.tsx'
import {BrowserRouter} from 'react-router-dom'
import {SavedPostsProvider} from './SavedPostsProvider.tsx'
import {NotificationsProvider} from './NotificationsProvider.tsx'

initializeTheme()

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <SavedPostsProvider>
                    <NotificationsProvider>
                        <App/>
                    </NotificationsProvider>
                </SavedPostsProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
)
