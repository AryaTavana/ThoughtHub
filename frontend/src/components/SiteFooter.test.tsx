import {render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, expect, it} from 'vitest'

import {SiteFooter} from './SiteFooter'

describe('SiteFooter', () => {
    it('shows the developer name and email contact', () => {
        render(
            <MemoryRouter>
                <SiteFooter/>
            </MemoryRouter>,
        )

        expect(screen.getByText('Arya Tavana')).toBeInTheDocument()
        expect(
            screen.getByRole('link', {name: 'aryatavana07@gmail.com'}),
        ).toHaveAttribute('href', 'mailto:aryatavana07@gmail.com')
    })
})
