import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import {ApiError, apiRequest, getCookie} from './client'

function createJsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    })
}

function clearCookies() {
    for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0]?.trim()

        if (name) {
            document.cookie = `${name}=; Max-Age=0; path=/`
        }
    }
}

describe('getCookie', () => {
    beforeEach(clearCookies)
    afterEach(clearCookies)

    it('returns and decodes a matching cookie', () => {
        document.cookie = 'csrftoken=secure%20token; path=/'

        expect(getCookie('csrftoken')).toBe('secure token')
    })

    it('returns null when the cookie is missing', () => {
        expect(getCookie('csrftoken')).toBeNull()
    })
})

describe('apiRequest', () => {
    const fetchMock = vi.fn<typeof fetch>()

    beforeEach(() => {
        clearCookies()
        fetchMock.mockReset()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        clearCookies()
        vi.unstubAllGlobals()
    })

    it('parses JSON and includes session credentials on GET requests', async () => {
        const payload = {results: [{id: 1, title: 'Django'}]}
        fetchMock.mockResolvedValue(createJsonResponse(payload))

        const result = await apiRequest<typeof payload>('/api/posts/')

        expect(result).toEqual(payload)
        expect(fetchMock).toHaveBeenCalledOnce()

        const requestOptions = fetchMock.mock.calls[0]?.[1]
        const headers = new Headers(requestOptions?.headers)
        expect(requestOptions?.method).toBe('GET')
        expect(requestOptions?.credentials).toBe('include')
        expect(headers.has('X-CSRFToken')).toBe(false)
    })

    it('adds JSON and CSRF headers to unsafe requests', async () => {
        document.cookie = 'csrftoken=test-token; path=/'
        fetchMock.mockResolvedValue(
            createJsonResponse({status: 'pending'}, 201),
        )

        await apiRequest('/api/posts/example/comments/', {
            method: 'POST',
            body: JSON.stringify({content: 'A comment'}),
        })

        const requestOptions = fetchMock.mock.calls[0]?.[1]
        const headers = new Headers(requestOptions?.headers)
        expect(headers.get('Content-Type')).toBe('application/json')
        expect(headers.get('X-CSRFToken')).toBe('test-token')
    })

    it('does not set a content type for FormData uploads', async () => {
        document.cookie = 'csrftoken=upload-token; path=/'
        fetchMock.mockResolvedValue(createJsonResponse({id: 1}, 201))
        const formData = new FormData()
        formData.append('title', 'Post with image')

        await apiRequest('/api/dashboard/posts/', {
            method: 'POST',
            body: formData,
        })

        const requestOptions = fetchMock.mock.calls[0]?.[1]
        const headers = new Headers(requestOptions?.headers)
        expect(headers.has('Content-Type')).toBe(false)
        expect(headers.get('X-CSRFToken')).toBe('upload-token')
    })

    it('returns null for a successful 204 response', async () => {
        fetchMock.mockResolvedValue(new Response(null, {status: 204}))

        const result = await apiRequest<null>('/api/auth/logout/', {
            method: 'POST',
        })

        expect(result).toBeNull()
    })

    it('throws an ApiError with the API detail message', async () => {
        const errorData = {detail: 'Authentication credentials were not provided.'}
        fetchMock.mockResolvedValue(createJsonResponse(errorData, 403))

        const request = apiRequest('/api/dashboard/posts/')

        await expect(request).rejects.toEqual(
            expect.objectContaining({
                name: 'ApiError',
                message: errorData.detail,
                status: 403,
                data: errorData,
            }),
        )
        await expect(request).rejects.toBeInstanceOf(ApiError)
    })

    it('keeps structured validation errors on ApiError.data', async () => {
        const errorData = {
            content: ['Comment content cannot be empty.'],
        }
        fetchMock.mockResolvedValue(createJsonResponse(errorData, 400))

        await expect(
            apiRequest('/api/posts/example/comments/', {
                method: 'POST',
                body: JSON.stringify({content: ''}),
            }),
        ).rejects.toMatchObject({
            message: 'Request failed with status 400.',
            status: 400,
            data: errorData,
        })
    })
})
