const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export class ApiError extends Error {
    status: number
    data: unknown

    constructor(message: string, status: number, data: unknown) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.data = data
    }
}

export function getCookie(name: string): string | null {
    const prefix = `${name}=`
    const cookie = document.cookie
        .split('; ')
        .find((item) => item.startsWith(prefix))

    if (!cookie) {
        return null
    }

    return decodeURIComponent(cookie.slice(prefix.length))
}

function getErrorMessage(data: unknown, status: number): string {
    if (
        typeof data === 'object' &&
        data !== null &&
        'detail' in data
    ) {
        const detail = (data as { detail: unknown }).detail

        if (typeof detail === 'string') {
            return detail
        }
    }

    return `Request failed with status ${status}.`
}

async function parseResponse(response: Response): Promise<unknown> {
    if (response.status === 204) {
        return null
    }

    const responseText = await response.text()
    if (!responseText) {
        return null
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
        return JSON.parse(responseText)
    }

    return responseText
}

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase()
    const headers = new Headers(options.headers)

    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers.has('Content-Type')
    ) {
        headers.set('Content-Type', 'application/json')
    }

    if (!SAFE_HTTP_METHODS.has(method) && !headers.has('X-CSRFToken')) {
        const csrfToken = getCookie('csrftoken')

        if (csrfToken) {
            headers.set('X-CSRFToken', csrfToken)
        }
    }

    const response = await fetch(path, {
        ...options,
        method,
        headers,
        credentials: options.credentials ?? 'include',
    })
    const data = await parseResponse(response)

    if (!response.ok) {
        throw new ApiError(
            getErrorMessage(data, response.status),
            response.status,
            data,
        )
    }

    return data as T
}