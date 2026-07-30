import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  getCurrentUser,
  initializeCsrf,
  login,
  logout,
  register,
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
})
