import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it} from 'vitest'

import {applyTheme} from '../theme'
import {ThemeToggle} from './ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    applyTheme('dark')
  })

  it('stays synchronized when another control changes the theme', async () => {
    const user = userEvent.setup()
    render(
      <>
        <ThemeToggle />
        <button type="button" onClick={() => applyTheme('light')}>
          Choose light
        </button>
      </>,
    )

    expect(
      screen.getByRole('button', {name: 'Use light theme'}),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', {name: 'Choose light'}))

    expect(
      screen.getByRole('button', {name: 'Use dark theme'}),
    ).toBeInTheDocument()
  })
})
