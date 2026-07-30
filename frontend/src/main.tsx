import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import '@fontsource/open-sans/latin-400.css'
import '@fontsource/open-sans/latin-500.css'
import '@fontsource/open-sans/latin-600.css'
import '@fontsource/open-sans/latin-700.css'
import './index.css'
import App from './App.tsx'
import {initializeTheme} from './theme.ts'

initializeTheme()

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App/>
    </StrictMode>,
)
