import {
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'

import {
    getApiErrorMessage,
    getApiFieldErrors,
    type FieldErrors,
} from '../api/errors'
import {
    createAuthorPostBlock,
    updateAuthorPostBlock,
    type AuthorPostBlock,
    type AuthorPostBlockInput,
    type ImageWidth,
    type PostBlockType,
} from '../api/posts'

const BLOCK_TYPE_OPTIONS: Array<{
    value: PostBlockType
    label: string
}> = [
    {value: 'rich_text', label: 'Rich text'},
    {value: 'image', label: 'Image'},
    {value: 'video', label: 'Video'},
    {value: 'quote', label: 'Quote'},
    {value: 'divider', label: 'Divider'},
]

const IMAGE_WIDTH_OPTIONS: Array<{
    value: ImageWidth
    label: string
}> = [
    {value: 'content', label: 'Content width'},
    {value: 'wide', label: 'Wide'},
    {value: 'full', label: 'Full width'},
]

function createInitialData(
    block: AuthorPostBlock | undefined,
    position: number,
): AuthorPostBlockInput {
    return {
        block_type: block?.block_type ?? 'rich_text',
        position,
        content: block?.content ?? '',
        image: null,
        image_alt: block?.image_alt ?? '',
        caption: block?.caption ?? '',
        image_width: block?.image_width ?? 'content',
        video_url: block?.video_url ?? '',
        quote_attribution: block?.quote_attribution ?? '',
    }
}

function normalizeInput(
    input: AuthorPostBlockInput,
): AuthorPostBlockInput {
    return {
        ...input,
        content:
            input.block_type === 'rich_text' ||
            input.block_type === 'quote'
                ? input.content
                : '',
        image_alt:
            input.block_type === 'image'
                ? input.image_alt
                : '',
        caption:
            input.block_type === 'image'
                ? input.caption
                : '',
        video_url:
            input.block_type === 'video'
                ? input.video_url
                : '',
        quote_attribution:
            input.block_type === 'quote'
                ? input.quote_attribution
                : '',
    }
}

interface BlockFieldErrorProps {
    field: keyof AuthorPostBlockInput
    messages?: string[]
    prefix: string
}

function BlockFieldError({
    field,
    messages,
    prefix,
}: BlockFieldErrorProps) {
    if (!messages?.length) {
        return null
    }

    return (
        <div
            id={`${prefix}-${field}-error`}
            className="invalid-feedback d-block"
        >
            {messages.join(' ')}
        </div>
    )
}

interface PostBlockFormProps {
    postId: number
    block?: AuthorPostBlock
    position: number
    onSaved: (block: AuthorPostBlock) => void
    onCancel: () => void
}

export function PostBlockForm({
    postId,
    block,
    position,
    onSaved,
    onCancel,
}: PostBlockFormProps) {
    const [formData, setFormData] =
        useState<AuthorPostBlockInput>(() =>
            createInitialData(block, position),
        )
    const [fieldErrors, setFieldErrors] =
        useState<FieldErrors>({})
    const [submitError, setSubmitError] =
        useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const fieldPrefix = `block-${block?.id ?? 'new'}`

    function clearFieldError(field: keyof AuthorPostBlockInput) {
        setFieldErrors((currentErrors) => {
            if (!currentErrors[field]) {
                return currentErrors
            }

            const nextErrors = {...currentErrors}
            delete nextErrors[field]
            return nextErrors
        })
        setSubmitError(null)
    }

    function handleTextChange(
        event: ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) {
        const field = event.target.name as keyof AuthorPostBlockInput

        setFormData((currentData) => ({
            ...currentData,
            [field]: event.target.value,
        }))
        clearFieldError(field)
    }

    function handleImageChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        setFormData((currentData) => ({
            ...currentData,
            image: event.target.files?.[0] ?? null,
        }))
        clearFieldError('image')
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFieldErrors({})
        setSubmitError(null)
        const input = normalizeInput(formData)

        if (
            input.block_type === 'image' &&
            !input.image &&
            !block?.image
        ) {
            setFieldErrors({
                image: ['Choose an image for this block.'],
            })
            return
        }

        setIsSubmitting(true)

        try {
            const savedBlock = block
                ? await updateAuthorPostBlock(
                    postId,
                    block.id,
                    input,
                )
                : await createAuthorPostBlock(postId, input)

            onSaved(savedBlock)
        } catch (error) {
            const apiFieldErrors = getApiFieldErrors(error)
            setFieldErrors(apiFieldErrors)

            const generalMessages =
                apiFieldErrors.non_field_errors ??
                apiFieldErrors.detail

            if (generalMessages?.[0]) {
                setSubmitError(generalMessages[0])
            } else if (Object.keys(apiFieldErrors).length === 0) {
                setSubmitError(
                    getApiErrorMessage(
                        error,
                        block
                            ? 'Unable to update this block.'
                            : 'Unable to add this block.',
                    ),
                )
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form
            className="border rounded p-3 bg-body-tertiary"
            onSubmit={handleSubmit}
            aria-label={block ? 'Edit content block' : 'Add content block'}
            aria-busy={isSubmitting}
        >
            {submitError && (
                <div className="alert alert-danger" role="alert">
                    {submitError}
                </div>
            )}

            <div className="mb-3">
                <label
                    className="form-label"
                    htmlFor={`${fieldPrefix}-type`}
                >
                    Block type
                </label>
                <select
                    id={`${fieldPrefix}-type`}
                    className={`form-select ${
                        fieldErrors.block_type ? 'is-invalid' : ''
                    }`}
                    name="block_type"
                    value={formData.block_type}
                    onChange={handleTextChange}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.block_type)}
                    aria-describedby={
                        fieldErrors.block_type
                            ? `${fieldPrefix}-block_type-error`
                            : undefined
                    }
                >
                    {BLOCK_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <BlockFieldError
                    field="block_type"
                    messages={fieldErrors.block_type}
                    prefix={fieldPrefix}
                />
            </div>

            {formData.block_type === 'rich_text' && (
                <div className="mb-3">
                    <label
                        className="form-label"
                        htmlFor={`${fieldPrefix}-content`}
                    >
                        Rich text HTML
                    </label>
                    <textarea
                        id={`${fieldPrefix}-content`}
                        className={`form-control font-monospace ${
                            fieldErrors.content ? 'is-invalid' : ''
                        }`}
                        name="content"
                        value={formData.content}
                        onChange={handleTextChange}
                        rows={8}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(fieldErrors.content)}
                        aria-describedby={
                            fieldErrors.content
                                ? `${fieldPrefix}-content-error`
                                : undefined
                        }
                        required
                    />
                    <div className="form-text">
                        Safe headings, paragraphs, lists, links, quotes, and code markup are supported.
                    </div>
                    <BlockFieldError
                        field="content"
                        messages={fieldErrors.content}
                        prefix={fieldPrefix}
                    />
                </div>
            )}

            {formData.block_type === 'quote' && (
                <>
                    <div className="mb-3">
                        <label
                            className="form-label"
                            htmlFor={`${fieldPrefix}-quote`}
                        >
                            Quote
                        </label>
                        <textarea
                            id={`${fieldPrefix}-quote`}
                            className={`form-control ${
                                fieldErrors.content ? 'is-invalid' : ''
                            }`}
                            name="content"
                            value={formData.content}
                            onChange={handleTextChange}
                            rows={4}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(fieldErrors.content)}
                            aria-describedby={
                                fieldErrors.content
                                    ? `${fieldPrefix}-content-error`
                                    : undefined
                            }
                            required
                        />
                        <BlockFieldError
                            field="content"
                            messages={fieldErrors.content}
                            prefix={fieldPrefix}
                        />
                    </div>

                    <div className="mb-3">
                        <label
                            className="form-label"
                            htmlFor={`${fieldPrefix}-attribution`}
                        >
                            Attribution
                        </label>
                        <input
                            id={`${fieldPrefix}-attribution`}
                            className={`form-control ${
                                fieldErrors.quote_attribution
                                    ? 'is-invalid'
                                    : ''
                            }`}
                            name="quote_attribution"
                            value={formData.quote_attribution}
                            onChange={handleTextChange}
                            maxLength={200}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(
                                fieldErrors.quote_attribution,
                            )}
                        />
                        <BlockFieldError
                            field="quote_attribution"
                            messages={fieldErrors.quote_attribution}
                            prefix={fieldPrefix}
                        />
                    </div>
                </>
            )}

            {formData.block_type === 'video' && (
                <div className="mb-3">
                    <label
                        className="form-label"
                        htmlFor={`${fieldPrefix}-video-url`}
                    >
                        Video URL
                    </label>
                    <input
                        id={`${fieldPrefix}-video-url`}
                        className={`form-control ${
                            fieldErrors.video_url ? 'is-invalid' : ''
                        }`}
                        name="video_url"
                        type="url"
                        value={formData.video_url}
                        onChange={handleTextChange}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(fieldErrors.video_url)}
                        aria-describedby={
                            fieldErrors.video_url
                                ? `${fieldPrefix}-video_url-error`
                                : undefined
                        }
                        required
                    />
                    <BlockFieldError
                        field="video_url"
                        messages={fieldErrors.video_url}
                        prefix={fieldPrefix}
                    />
                </div>
            )}

            {formData.block_type === 'image' && (
                <>
                    {block?.image && !formData.image && (
                        <img
                            className="img-fluid rounded mb-3"
                            src={block.image}
                            alt={block.image_alt}
                        />
                    )}

                    <div className="mb-3">
                        <label
                            className="form-label"
                            htmlFor={`${fieldPrefix}-image`}
                        >
                            Image file
                        </label>
                        <input
                            id={`${fieldPrefix}-image`}
                            className={`form-control ${
                                fieldErrors.image ? 'is-invalid' : ''
                            }`}
                            name="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(fieldErrors.image)}
                            aria-describedby={
                                fieldErrors.image
                                    ? `${fieldPrefix}-image-error`
                                    : undefined
                            }
                        />
                        {block?.image && (
                            <div className="form-text">
                                Choose a file only when replacing the current image.
                            </div>
                        )}
                        <BlockFieldError
                            field="image"
                            messages={fieldErrors.image}
                            prefix={fieldPrefix}
                        />
                    </div>

                    <div className="mb-3">
                        <label
                            className="form-label"
                            htmlFor={`${fieldPrefix}-image-alt`}
                        >
                            Alternative text
                        </label>
                        <input
                            id={`${fieldPrefix}-image-alt`}
                            className={`form-control ${
                                fieldErrors.image_alt ? 'is-invalid' : ''
                            }`}
                            name="image_alt"
                            value={formData.image_alt}
                            onChange={handleTextChange}
                            maxLength={200}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(fieldErrors.image_alt)}
                            aria-describedby={
                                fieldErrors.image_alt
                                    ? `${fieldPrefix}-image_alt-error`
                                    : undefined
                            }
                            required
                        />
                        <BlockFieldError
                            field="image_alt"
                            messages={fieldErrors.image_alt}
                            prefix={fieldPrefix}
                        />
                    </div>

                    <div className="mb-3">
                        <label
                            className="form-label"
                            htmlFor={`${fieldPrefix}-caption`}
                        >
                            Caption
                        </label>
                        <input
                            id={`${fieldPrefix}-caption`}
                            className={`form-control ${
                                fieldErrors.caption ? 'is-invalid' : ''
                            }`}
                            name="caption"
                            value={formData.caption}
                            onChange={handleTextChange}
                            maxLength={300}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(fieldErrors.caption)}
                        />
                        <BlockFieldError
                            field="caption"
                            messages={fieldErrors.caption}
                            prefix={fieldPrefix}
                        />
                    </div>

                    <div className="mb-3">
                        <label
                            className="form-label"
                            htmlFor={`${fieldPrefix}-image-width`}
                        >
                            Image width
                        </label>
                        <select
                            id={`${fieldPrefix}-image-width`}
                            className={`form-select ${
                                fieldErrors.image_width
                                    ? 'is-invalid'
                                    : ''
                            }`}
                            name="image_width"
                            value={formData.image_width}
                            onChange={handleTextChange}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(
                                fieldErrors.image_width,
                            )}
                        >
                            {IMAGE_WIDTH_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <BlockFieldError
                            field="image_width"
                            messages={fieldErrors.image_width}
                            prefix={fieldPrefix}
                        />
                    </div>
                </>
            )}

            {formData.block_type === 'divider' && (
                <p className="text-secondary">
                    A divider adds a visual break between neighboring blocks.
                </p>
            )}

            <div className="d-flex gap-2">
                <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving block…' : 'Save block'}
                </button>
                <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}
