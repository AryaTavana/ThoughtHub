import {Icon} from '@iconify/react'
import moonIcon from '@iconify-icons/lucide/moon'
import sunIcon from '@iconify-icons/lucide/sun'
import {useState} from 'react'

import {applyTheme, type Theme} from '../theme'

function getActiveTheme(): Theme {
    return document.documentElement.dataset.theme === 'light'
        ? 'light'
        : 'dark'
}

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(getActiveTheme)

    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'

    return (
        <button
            className="app-icon-button"
            type="button"
            aria-label={`Use ${nextTheme} theme`}
            onClick={() => {
                applyTheme(nextTheme)
                setTheme(nextTheme)
            }}
        >
            <Icon
                icon={theme === 'dark' ? sunIcon : moonIcon}
                aria-hidden="true"
            />
        </button>
    )
}
