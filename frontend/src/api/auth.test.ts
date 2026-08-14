import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  confirmPasswordReset,
  getCurrentUser,
  getPublicUserProfile,
  initializeCsrf,
  login,
  logout,
  register,
  requestPasswordReset,
  updateCurrentUser,
  type CurrentUser,
  type LoginCredentials,
  type RegistrationData,
} from './auth'
import { apiRequest } from './client'

vi.mock('./client', () => ({
  apiRequest: vi.fn(),
}))

const apiRequestMock = vi.mocked(apiRequest)

const currentUser: CurrentUser = {
  id: 7,
  username: 'arya',
  email: 'arya@example.com',
  first_name: 'Arya',
  last_name: 'Tavana',
  is_staff: false,
}

describe('authentication API service', () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
  })

  it('initializes Django CSRF protection', async () => {
    const response = { detail: 'CSRF cookie set.' }
    apiRequestMock.mockResolvedValue(response)

    await expect(initializeCsrf()).resolves.toEqual(response)
    expect(apiRequestMock).toHaveBeenCalledWith('/api/auth/csrf/')
  })

  it('loads the current authenticated user', async () => {
    apiRequestMock.mockResolvedValue(currentUser)

    await expect(getCurrentUser()).resolves.toEqual(currentUser)
    expect(apiRequestMock).toHaveBeenCalledWith('/api/auth/me/')
  })

  it('updates editable account fields', async () => {
    const update = {
      email: 'updated@example.com',
      first_name: 'Updated',
      last_name: 'Author',
    }
    apiRequestMock.mockResolvedValue({...currentUser, ...update})

    await updateCurrentUser(update)

    expect(apiRequestMock).toHaveBeenCalledWith('/api/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(update),
    })
  })

  it('loads a public profile using a safe URL segment', async () => {
    const profile = {
      username: 'آریا',
      first_name: 'Arya',
      last_name: 'Tavana',
      published_posts_count: 2,
      total_reading_time: 8,
      topics_count: 3,
    }
    apiRequestMock.mockResolvedValue(profile)

    await expect(getPublicUserProfile('آریا')).resolves.toEqual(profile)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/auth/profiles/%D8%A2%D8%B1%DB%8C%D8%A7/',
    )
  })

  it('sends login credentials as JSON', async () => {
    const credentials: LoginCredentials = {
      username: 'arya',
      password: 'StrongPassword123!',
    }
    apiRequestMock.mockResolvedValue(currentUser)

    await expect(login(credentials)).resolves.toEqual(currentUser)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/auth/login/',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      },
    )
  })

  it('sends complete registration data as JSON', async () => {
    const registrationData: RegistrationData = {
      username: 'arya',
      email: 'arya@example.com',
      first_name: 'Arya',
      last_name: 'Tavana',
      password: 'StrongPassword123!',
      password_confirm: 'StrongPassword123!',
    }
    apiRequestMock.mockResolvedValue(currentUser)

    await expect(register(registrationData)).resolves.toEqual(currentUser)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/auth/register/',
      {
        method: 'POST',
        body: JSON.stringify(registrationData),
      },
    )
  })

  it('logs out using an unsafe POST request', async () => {
    const response = { detail: 'Logged out.' }
    apiRequestMock.mockResolvedValue(response)

    await expect(logout()).resolves.toEqual(response)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/auth/logout/',
      {
        method: 'POST',
      },
    )
  })

  it('requests and confirms a password reset', async () => {
    apiRequestMock.mockResolvedValue({detail: 'Done.'})
    const confirmation = {
      uid: 'Nw',
      token: 'one-use-token',
      new_password: 'StrongPassword456!',
      new_password_confirm: 'StrongPassword456!',
    }

    await requestPasswordReset('arya@example.com')
    await confirmPasswordReset(confirmation)

    expect(apiRequestMock).toHaveBeenNthCalledWith(
      1,
      '/api/auth/password-reset/',
      {
        method: 'POST',
        body: JSON.stringify({email: 'arya@example.com'}),
      },
    )
    expect(apiRequestMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/password-reset/confirm/',
      {
        method: 'POST',
        body: JSON.stringify(confirmation),
      },
    )
  })
})
