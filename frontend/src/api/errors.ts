import {ApiError} from './client'

export type FieldErrors = Record<string, string[]>

export function getApiFieldErrors(
    error: unknown,
): FieldErrors {
    if (
        !(error instanceof ApiError) ||
        typeof error.data !== 'object' ||
        error.data === null ||
        Array.isArray(error.data)
    ) {
        return {}
    }

    const fieldErrors: FieldErrors = {}

    for (const [field, value] of Object.entries(error.data)) {
        if (typeof value === 'string') {
            fieldErrors[field] = [value]
            continue
        }

        if (Array.isArray(value)) {
            const messages = value.filter(
                (item): item is string => typeof item === 'string',
            )

            if (messages.length > 0) {
                fieldErrors[field] = messages
            }
        }
    }

    return fieldErrors
}

export function getApiErrorMessage(
    error: unknown,
    fallbackMessage: string,
): string {
    const fieldErrors = getApiFieldErrors(error)
    const firstFieldMessage =
        Object.values(fieldErrors)[0]?.[0]

    if (firstFieldMessage) {
        return firstFieldMessage
    }

    if (error instanceof Error) {
        return error.message
    }

    return fallbackMessage
}