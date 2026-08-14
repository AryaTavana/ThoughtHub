import DOMPurify from 'dompurify'

const allowedRichTextTags = [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'u',
    's',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'code',
    'pre',
] as const

const allowedRichTextAttributes = [
    'href',
    'title',
]

const supportedMarkupPattern = new RegExp(
    `<\\/?(?:${allowedRichTextTags.join('|')})\\b`,
    'i',
)

export function containsSupportedMarkup(content: string): boolean {
    return supportedMarkupPattern.test(content)
}

export function sanitizeRichText(content: string): string {
    return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [...allowedRichTextTags],
        ALLOWED_ATTR: allowedRichTextAttributes,
        ALLOW_DATA_ATTR: false,
    })
}
