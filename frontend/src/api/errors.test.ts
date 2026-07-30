import {
  describe,
  expect,
  it,
} from 'vitest'

import { ApiError } from './client'
import {
  getApiErrorMessage,
  getApiFieldErrors,
} from './errors'

describe('getApiFieldErrors', () => {
  it('normalizes Django string and array field errors', () => {
    const error = new ApiError(
      'Request failed with status 400.',
      400,
      {
        credentials: ['Invalid username or password.'],
        email: 'Enter a valid email address.',
        ignored: [42, null],
      },
    )

    expect(getApiFieldErrors(error)).toEqual({
      credentials: ['Invalid username or password.'],
      email: ['Enter a valid email address.'],
    })
  })

  it('returns no field errors for unrelated error values', () => {
    expect(getApiFieldErrors(new Error('Network failed.'))).toEqual({})
    expect(getApiFieldErrors(null)).toEqual({})
  })
})

describe('getApiErrorMessage', () => {
  it('returns the first Django field message', () => {
    const error = new ApiError(
      'Request failed with status 400.',
      400,
      {
        credentials: ['Invalid username or password.'],
      },
    )

    expect(
      getApiErrorMessage(error, 'Unable to log in.'),
    ).toBe('Invalid username or password.')
  })

  it('returns the message from a regular Error', () => {
    expect(
      getApiErrorMessage(
        new Error('Django is unavailable.'),
        'Unable to connect.',
      ),
    ).toBe('Django is unavailable.')
  })

  it('uses the fallback for an unknown error value', () => {
    expect(
      getApiErrorMessage(null, 'Unable to log in.'),
    ).toBe('Unable to log in.')
  })
})
