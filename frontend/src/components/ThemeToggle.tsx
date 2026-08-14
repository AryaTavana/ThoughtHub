import {Icon} from '@iconify/react'
import moonIcon from '@iconify-icons/lucide/moon'
import sunIcon from '@iconify-icons/lucide/sun'
import {useEffect, useState} from 'react'

import {
    applyTheme,
    getActiveTheme,
    THEME_CHANGE_EVENT,
    type Theme,
} from '../theme'

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(getActiveTheme)

    useEffect(() => {
        function syncTheme(event: Event) {
            setTheme((event as CustomEvent<Theme>).detail)
        }

        window.addEventListener(THEME_CHANGE_EVENT, syncTheme)
        return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme)
    }, [])

    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'

    return (
        <button
            className="app-icon-button"
            type="button"
            aria-label={`Use ${nextTheme} theme`}
            onClick={() => {
                applyTheme(nextTheme)
            }}
        >
            <Icon
                icon={theme === 'dark' ? sunIcon : moonIcon}
                aria-hidden="true"
            />
        </button>
    )
}
