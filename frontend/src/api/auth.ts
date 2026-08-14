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

export interface CurrentUserUpdate {
    email: string
    first_name: string
    last_name: string
}

export interface PublicUserProfile {
    username: string
    first_name: string
    last_name: string
    published_posts_count: number
    total_reading_time: number
    topics_count: number
}

export interface PasswordResetConfirmation {
    uid: string
    token: string
    new_password: string
    new_password_confirm: string
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

export function updateCurrentUser(
    update: CurrentUserUpdate,
): Promise<CurrentUser> {
    return apiRequest<CurrentUser>('/api/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify(update),
    })
}

export function getPublicUserProfile(
    username: string,
): Promise<PublicUserProfile> {
    return apiRequest<PublicUserProfile>(
        `/api/auth/profiles/${encodeURIComponent(username)}/`,
    )
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

export function requestPasswordReset(
    email: string,
): Promise<DetailResponse> {
    return apiRequest<DetailResponse>('/api/auth/password-reset/', {
        method: 'POST',
        body: JSON.stringify({email}),
    })
}

export function confirmPasswordReset(
    confirmation: PasswordResetConfirmation,
): Promise<DetailResponse> {
    return apiRequest<DetailResponse>(
        '/api/auth/password-reset/confirm/',
        {
            method: 'POST',
            body: JSON.stringify(confirmation),
        },
    )
}
