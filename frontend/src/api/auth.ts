import {apiRequest} from './client'

export interface CurrentUser {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
    is_staff: boolean
}

export interface LoginCredentials {
    username: string
    password: string
}

export interface RegistrationData {
    username: string
    email: string
    first_name?: string
    last_name?: string
    password: string
    password_confirm: string
}

export interface DetailResponse {
    detail: string
}

export function initializeCsrf(): Promise<DetailResponse> {
    return apiRequest<DetailResponse>('/api/auth/csrf/')
}

export function getCurrentUser(): Promise<CurrentUser> {
    return apiRequest<CurrentUser>('/api/auth/me/')
}

export function login(
    credentials: LoginCredentials,
): Promise<CurrentUser> {
    return apiRequest<CurrentUser>('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify(credentials),
    })
}

export function register(
    registrationData: RegistrationData,
): Promise<CurrentUser> {
    return apiRequest<CurrentUser>('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify(registrationData),
    })
}

export function logout(): Promise<DetailResponse> {
    return apiRequest<DetailResponse>('/api/auth/logout/', {
        method: 'POST',
    })
}