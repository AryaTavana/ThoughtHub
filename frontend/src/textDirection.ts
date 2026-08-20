export type TextDirection = 'auto' | 'ltr' | 'rtl'

const markupPattern = /<[^>]*>/g
const entityPattern = /&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/gi
const rtlLetterPattern = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Adlam}]/u
const letterPattern = /\p{Letter}/u

/**
 * Follow the first-strong-character rule used by HTML's `dir="auto"`,
 * while returning an explicit direction that can also drive CSS.
 */
export function getTextDirection(
    value: string | null | undefined,
): TextDirection {
    const plainText = (value ?? '')
        .replace(markupPattern, ' ')
        .replace(entityPattern, ' ')

    for (const character of plainText) {
        if (rtlLetterPattern.test(character)) {
            return 'rtl'
        }

        if (letterPattern.test(character)) {
            return 'ltr'
        }
    }

    return 'auto'
}
