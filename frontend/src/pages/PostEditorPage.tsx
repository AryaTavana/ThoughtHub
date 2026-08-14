import {Icon} from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/lucide/arrow-left'
import fileTextIcon from '@iconify-icons/lucide/file-text'
import imageIcon from '@iconify-icons/lucide/image'
import layersIcon from '@iconify-icons/lucide/layers-3'
import searchIcon from '@iconify-icons/lucide/search'
import sendIcon from '@iconify-icons/lucide/send'
import trashIcon from '@iconify-icons/lucide/trash-2'
import {
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import {
    Link,
    useNavigate,
    useParams,
} from 'react-router-dom'

import {
    getApiErrorMessage,
    getApiFieldErrors,
    type FieldErrors,
} from '../api/errors'
import {
    createAuthorPost,
    deleteAuthorPost,
    getAuthorPost,
    getCategories,
    getTags,
    publishAuthorPost,
    updateAuthorPost,
    type AuthorPostDetail,
    type AuthorPostInput,
    type Category,
    type PostStatus,
    type PostType,
    type Tag,
} from '../api/posts'
import {PostBlocksEditor} from '../components/PostBlocksEditor'

const INITIAL_FORM_DATA: AuthorPostInput = {
    title: '',
    excerpt: '',
    content: '',
    category: null,
    tags: [],
    featured_image_alt: '',
    post_type: 'article',
    allow_comments: true,
    meta_title: '',
    meta_description: '',
}

const POST_TYPE_OPTIONS: Array<{
    value: PostType
    label: string
}> = [
    {value: 'article', label: 'Article'},
    {value: 'news', label: 'News'},
    {value: 'tutorial', label: 'Tutorial'},
    {value: 'opinion', label: 'Opinion'},
]

const PUBLISHABLE_STATUSES = new Set<PostStatus>([
    'draft',
    'removed',
])

function toFormData(post: AuthorPostDetail): AuthorPostInput {
    return {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        tags: post.tags,
        featured_image_alt: post.featured_image_alt,
        post_type: post.post_type,
        allow_comments: post.allow_comments,
        meta_title: post.meta_title,
        meta_description: post.meta_description,
    }
}

interface FieldErrorProps {
    field: keyof AuthorPostInput
    messages?: string[]
}

function FieldError({field, messages}: FieldErrorProps) {
    if (!messages?.length) {
        return null
    }

    return (
        <div
            id={`post-${field}-error`}
            className="invalid-feedback d-block"
        >
            {messages.join(' ')}
        </div>
    )
}

export function PostEditorPage() {
    const {postId: postIdParameter} = useParams()
    const navigate = useNavigate()
    const isEditing = postIdParameter !== undefined
    const postId = Number(postIdParameter)
    const hasValidPostId =
        !isEditing ||
        (Number.isInteger(postId) && postId > 0)

    const [formData, setFormData] =
        useState<AuthorPostInput>(INITIAL_FORM_DATA)
    const [categories, setCategories] = useState<Category[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [post, setPost] =
        useState<AuthorPostDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] =
        useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [fieldErrors, setFieldErrors] =
        useState<FieldErrors>({})
    const [submitError, setSubmitError] =
        useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [featuredImageFile, setFeaturedImageFile] =
        useState<File | null>(null)

    useEffect(() => {
        let isCancelled = false

        async function loadEditor() {
            setIsLoading(true)
            setLoadError(null)

            if (!hasValidPostId) {
                setLoadError('This post address is invalid.')
                setIsLoading(false)
                return
            }

            try {
                const [categoryChoices, tagChoices, existingPost] =
                    await Promise.all([
                        getCategories(),
                        getTags(),
                        isEditing
                            ? getAuthorPost(postId)
                            : Promise.resolve(null),
                    ])

                if (!isCancelled) {
                    setCategories(categoryChoices)
                    setTags(tagChoices)
                    setPost(existingPost)
                    setFeaturedImageFile(null)
                    setFormData(
                        existingPost
                            ? toFormData(existingPost)
                            : INITIAL_FORM_DATA,
                    )
                }
            } catch (error) {
                if (!isCancelled) {
                    setLoadError(
                        getApiErrorMessage(
                            error,
                            'Unable to load the post editor.',
                        ),
                    )
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadEditor()

        return () => {
            isCancelled = true
        }
    }, [hasValidPostId, isEditing, postId, reloadKey])

    function clearFieldError(field: keyof AuthorPostInput) {
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
        const field = event.target.name as keyof AuthorPostInput
        const value = event.target.value

        setFormData((currentData) => ({
            ...currentData,
            [field]: field === 'category'
                ? value
                    ? Number(value)
                    : null
                : value,
        }))
        clearFieldError(field)
    }

    function handleCommentsChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        setFormData((currentData) => ({
            ...currentData,
            allow_comments: event.target.checked,
        }))
        clearFieldError('allow_comments')
    }

    function handleFeaturedImageChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0] ?? null
        setFeaturedImageFile(file)
        clearFieldError('featured_image')

        if (!file) {
            return
        }

        setSubmitError(null)
    }

    function handleTagChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const tagId = Number(event.target.value)

        setFormData((currentData) => ({
            ...currentData,
            tags: event.target.checked
                ? [...currentData.tags, tagId]
                : currentData.tags.filter(
                    (currentTagId) => currentTagId !== tagId,
                ),
        }))
        clearFieldError('tags')
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFieldErrors({})
        setSubmitError(null)
        setIsSubmitting(true)

        const submitter = (
            event.nativeEvent as SubmitEvent
        ).submitter as HTMLButtonElement | null
        const shouldPublish = submitter?.value === 'publish'

        try {
            const submission = featuredImageFile
                ? {
                    ...formData,
                    featured_image: featuredImageFile,
                }
                : formData
            const savedPost = isEditing
                ? await updateAuthorPost(postId, submission)
                : await createAuthorPost(submission)

            if (shouldPublish) {
                await publishAuthorPost(savedPost.id)
            }

            navigate('/dashboard', {replace: true})
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
                        shouldPublish
                            ? 'Unable to publish this post.'
                            : 'Unable to save this post.',
                    ),
                )
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete() {
        if (!post || isDeleting || isSubmitting) {
            return
        }

        const shouldDelete = window.confirm(
            `Delete “${post.title}”? This cannot be undone.`,
        )

        if (!shouldDelete) {
            return
        }

        setSubmitError(null)
        setIsDeleting(true)

        try {
            await deleteAuthorPost(post.id)
            navigate('/dashboard', {replace: true})
        } catch (error) {
            setSubmitError(
                getApiErrorMessage(
                    error,
                    'Unable to delete this post.',
                ),
            )
        } finally {
            setIsDeleting(false)
        }
    }

    function handleContentEdited() {
        setPost((currentPost) => {
            if (!currentPost) {
                return currentPost
            }

            if (currentPost.status === 'removed') {
                return {
                    ...currentPost,
                    status: 'draft',
                }
            }

            return currentPost
        })
    }

    if (isLoading) {
        return (
            <section className="app-shell editor-page">
                <div className="content-state" role="status"><span className="loading-ring" aria-hidden="true"/><p>Loading post editor…</p></div>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="app-shell editor-page">
                <div className="app-alert app-alert--danger" role="alert">
                    <p>{loadError}</p>

                    {hasValidPostId && (
                        <button
                            className="button button--secondary"
                            type="button"
                            onClick={() => {
                                setReloadKey((current) => current + 1)
                            }}
                        >
                            Try again
                        </button>
                    )}

                    <Link
                        className="button button--secondary"
                        to="/dashboard"
                    >
                        Back to dashboard
                    </Link>
                </div>
            </section>
        )
    }

    const canPublish =
        !isEditing ||
        (post !== null && PUBLISHABLE_STATUSES.has(post.status))
    const formIsDisabled = isSubmitting || isDeleting

    return (
        <section className="app-shell editor-page">
            <div className="editor-workspace">
                    <header className="editor-header">
                        <div>
                            <Link className="editor-header__back" to="/dashboard"><Icon icon={arrowLeftIcon} aria-hidden="true"/> Dashboard</Link>
                            <p className="section-eyebrow">Writer workspace</p>
                            <h1>
                                {isEditing ? 'Edit post' : 'New post'}
                            </h1>
                            <p>
                                {isEditing
                                    ? 'Update your writing or publish it immediately.'
                                    : 'Save a draft or publish when you are ready.'}
                            </p>
                        </div>

                        {post && (
                            <span className={`status-badge status-badge--${post.status}`}>
                                {post.status.replace('_', ' ')}
                            </span>
                        )}
                    </header>

                    {post?.review_feedback && (
                        <div className="app-alert app-alert--warning" role="status">
                            <strong>Moderation feedback:</strong>{' '}
                            {post.review_feedback}
                        </div>
                    )}

                    {submitError && (
                        <div className="app-alert app-alert--danger" role="alert">
                            {submitError}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        aria-busy={formIsDisabled}
                    >
                        <div className="card editor-panel editor-panel--details">
                            <div className="card-body">
                                <div className="editor-panel__heading"><span><Icon icon={fileTextIcon} aria-hidden="true"/></span><div><p className="section-eyebrow">Core story</p><h2>Post details</h2><p>Give readers a clear reason to open and continue reading.</p></div></div>

                                <div className="mb-3">
                                    <label
                                        className="form-label"
                                        htmlFor="post-title"
                                    >
                                        Title
                                    </label>
                                    <input
                                        id="post-title"
                                        className={`form-control ${
                                            fieldErrors.title
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        name="title"
                                        value={formData.title}
                                        onChange={handleTextChange}
                                        maxLength={200}
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(
                                            fieldErrors.title,
                                        )}
                                        aria-describedby={
                                            fieldErrors.title
                                                ? 'post-title-error'
                                                : undefined
                                        }
                                        required
                                    />
                                    <FieldError
                                        field="title"
                                        messages={fieldErrors.title}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label
                                        className="form-label"
                                        htmlFor="post-excerpt"
                                    >
                                        Excerpt
                                    </label>
                                    <textarea
                                        id="post-excerpt"
                                        className={`form-control ${
                                            fieldErrors.excerpt
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        name="excerpt"
                                        value={formData.excerpt}
                                        onChange={handleTextChange}
                                        maxLength={500}
                                        rows={3}
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(
                                            fieldErrors.excerpt,
                                        )}
                                        aria-describedby={
                                            fieldErrors.excerpt
                                                ? 'post-excerpt-error'
                                                : undefined
                                        }
                                    />
                                    <div className="form-text">
                                        A short summary for post lists and previews.
                                    </div>
                                    <FieldError
                                        field="excerpt"
                                        messages={fieldErrors.excerpt}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label
                                        className="form-label"
                                        htmlFor="post-content"
                                    >
                                        Introduction or body
                                    </label>
                                    <textarea
                                        id="post-content"
                                        className={`form-control ${
                                            fieldErrors.content
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        name="content"
                                        value={formData.content}
                                        onChange={handleTextChange}
                                        rows={12}
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(
                                            fieldErrors.content,
                                        )}
                                        aria-describedby={
                                            fieldErrors.content
                                                ? 'post-content-error'
                                                : undefined
                                        }
                                    />
                                    <FieldError
                                        field="content"
                                        messages={fieldErrors.content}
                                    />
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label
                                            className="form-label"
                                            htmlFor="post-type"
                                        >
                                            Post type
                                        </label>
                                        <select
                                            id="post-type"
                                            className={`form-select ${
                                                fieldErrors.post_type
                                                    ? 'is-invalid'
                                                    : ''
                                            }`}
                                            name="post_type"
                                            value={formData.post_type}
                                            onChange={handleTextChange}
                                            disabled={formIsDisabled}
                                            aria-invalid={Boolean(
                                                fieldErrors.post_type,
                                            )}
                                            aria-describedby={
                                                fieldErrors.post_type
                                                    ? 'post-post_type-error'
                                                    : undefined
                                            }
                                        >
                                            {POST_TYPE_OPTIONS.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <FieldError
                                            field="post_type"
                                            messages={fieldErrors.post_type}
                                        />
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label
                                            className="form-label"
                                            htmlFor="post-category"
                                        >
                                            Category
                                        </label>
                                        <select
                                            id="post-category"
                                            className={`form-select ${
                                                fieldErrors.category
                                                    ? 'is-invalid'
                                                    : ''
                                            }`}
                                            name="category"
                                            value={formData.category ?? ''}
                                            onChange={handleTextChange}
                                            disabled={formIsDisabled}
                                            aria-invalid={Boolean(
                                                fieldErrors.category,
                                            )}
                                            aria-describedby={
                                                fieldErrors.category
                                                    ? 'post-category-error'
                                                    : undefined
                                            }
                                        >
                                            <option value="">No category</option>
                                            {categories.map((category) => (
                                                <option
                                                    key={category.id}
                                                    value={category.id}
                                                >
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                        <FieldError
                                            field="category"
                                            messages={fieldErrors.category}
                                        />
                                    </div>
                                </div>

                                <fieldset
                                    className="mb-3"
                                    aria-describedby={
                                        fieldErrors.tags
                                            ? 'post-tags-error'
                                            : undefined
                                    }
                                >
                                    <legend className="form-label">
                                        Tags
                                    </legend>
                                    {tags.length === 0 ? (
                                        <p className="small text-secondary mb-0">
                                            No tags are available yet.
                                        </p>
                                    ) : (
                                        <div className="d-flex flex-wrap gap-3">
                                            {tags.map((tag) => (
                                                <div
                                                    className="form-check"
                                                    key={tag.id}
                                                >
                                                    <input
                                                        id={`post-tag-${tag.id}`}
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        value={tag.id}
                                                        checked={formData.tags.includes(
                                                            tag.id,
                                                        )}
                                                        onChange={handleTagChange}
                                                        disabled={formIsDisabled}
                                                    />
                                                    <label
                                                        className="form-check-label"
                                                        htmlFor={`post-tag-${tag.id}`}
                                                    >
                                                        {tag.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <FieldError
                                        field="tags"
                                        messages={fieldErrors.tags}
                                    />
                                </fieldset>

                                <div className="form-check">
                                    <input
                                        id="post-allow-comments"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={formData.allow_comments}
                                        onChange={handleCommentsChange}
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(
                                            fieldErrors.allow_comments,
                                        )}
                                        aria-describedby={
                                            fieldErrors.allow_comments
                                                ? 'post-allow_comments-error'
                                                : undefined
                                        }
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor="post-allow-comments"
                                    >
                                        Allow comments after publication
                                    </label>
                                    <FieldError
                                        field="allow_comments"
                                        messages={
                                            fieldErrors.allow_comments
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="card editor-panel editor-panel--search">
                            <div className="card-body">
                                <div className="editor-panel__heading"><span><Icon icon={searchIcon} aria-hidden="true"/></span><div><p className="section-eyebrow">Discoverability</p><h2>Search preview</h2><p>Optional text for search engines and link previews.</p></div></div>

                                <div className="mb-3">
                                    <label
                                        className="form-label"
                                        htmlFor="post-meta-title"
                                    >
                                        Search title
                                    </label>
                                    <input
                                        id="post-meta-title"
                                        className={`form-control ${
                                            fieldErrors.meta_title
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        name="meta_title"
                                        value={formData.meta_title}
                                        onChange={handleTextChange}
                                        maxLength={60}
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(
                                            fieldErrors.meta_title,
                                        )}
                                        aria-describedby={
                                            fieldErrors.meta_title
                                                ? 'post-meta_title-error'
                                                : undefined
                                        }
                                    />
                                    <div className="form-text">
                                        Optional, up to 60 characters.
                                    </div>
                                    <FieldError
                                        field="meta_title"
                                        messages={fieldErrors.meta_title}
                                    />
                                </div>

                                <div className="mb-0">
                                    <label
                                        className="form-label"
                                        htmlFor="post-meta-description"
                                    >
                                        Search description
                                    </label>
                                    <textarea
                                        id="post-meta-description"
                                        className={`form-control ${
                                            fieldErrors.meta_description
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        name="meta_description"
                                        value={formData.meta_description}
                                        onChange={handleTextChange}
                                        maxLength={160}
                                        rows={3}
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(
                                            fieldErrors.meta_description,
                                        )}
                                        aria-describedby={
                                            fieldErrors.meta_description
                                                ? 'post-meta_description-error'
                                                : undefined
                                        }
                                    />
                                    <div className="form-text">
                                        Optional, up to 160 characters.
                                    </div>
                                    <FieldError
                                        field="meta_description"
                                        messages={
                                            fieldErrors.meta_description
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="card editor-panel editor-panel--image">
                            <div className="card-body">
                                <div className="editor-panel__heading"><span><Icon icon={imageIcon} aria-hidden="true"/></span><div><p className="section-eyebrow">Visual context</p><h2>Post banner</h2><p>Upload the image readers will see on post cards and above the article.</p></div></div>
                                {post?.featured_image && !featuredImageFile && (
                                    <img
                                        className="editor-featured-image-preview"
                                        src={post.featured_image}
                                        alt={formData.featured_image_alt}
                                    />
                                )}
                                <div className="mb-3">
                                    <label
                                        className="form-label"
                                        htmlFor="post-featured-image"
                                    >
                                        Banner image
                                    </label>
                                    <input
                                        id="post-featured-image"
                                        className={`form-control ${
                                            fieldErrors.featured_image
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFeaturedImageChange}
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(
                                            fieldErrors.featured_image,
                                        )}
                                        aria-describedby={
                                            fieldErrors.featured_image
                                                ? 'post-featured_image-error'
                                                : 'post-featured-image-help'
                                        }
                                    />
                                    <div
                                        className="form-text"
                                        id="post-featured-image-help"
                                    >
                                        A wide image works best. It will be cropped to fit post cards.
                                    </div>
                                    {featuredImageFile && (
                                        <p className="editor-featured-image-selection">
                                            Selected: {featuredImageFile.name}
                                        </p>
                                    )}
                                    <FieldError
                                        field="featured_image"
                                        messages={fieldErrors.featured_image}
                                    />
                                </div>
                                <div>
                                    <label
                                        className="form-label"
                                        htmlFor="post-featured-image-alt"
                                    >
                                        Alternative text
                                    </label>
                                    <input
                                        id="post-featured-image-alt"
                                        className={`form-control ${
                                            fieldErrors.featured_image_alt
                                                ? 'is-invalid'
                                                : ''
                                        }`}
                                        name="featured_image_alt"
                                        value={formData.featured_image_alt}
                                        onChange={handleTextChange}
                                        maxLength={200}
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(
                                            fieldErrors.featured_image_alt,
                                        )}
                                        aria-describedby={
                                            fieldErrors.featured_image_alt
                                                ? 'post-featured_image_alt-error'
                                                : 'post-featured-image-alt-help'
                                        }
                                        required={Boolean(
                                            featuredImageFile || post?.featured_image,
                                        )}
                                    />
                                    <div
                                        className="form-text"
                                        id="post-featured-image-alt-help"
                                    >
                                        Briefly describe the image for readers who cannot see it.
                                    </div>
                                    <FieldError
                                        field="featured_image_alt"
                                        messages={
                                            fieldErrors.featured_image_alt
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="editor-actions">
                            <div><strong>{isEditing ? 'Save this revision' : 'Ready to begin?'}</strong><span>You can return and edit your work at any time.</span></div>
                            <button
                                className="button button--secondary"
                                type="submit"
                                value="save"
                                disabled={formIsDisabled}
                            >
                                {isSubmitting
                                    ? 'Saving…'
                                    : isEditing
                                        ? 'Save changes'
                                        : 'Create draft'}
                            </button>

                            {canPublish && (
                                <button
                                    className="button button--primary"
                                    type="submit"
                                    value="publish"
                                    disabled={formIsDisabled}
                                >
                                    {isSubmitting
                                        ? 'Publishing…'
                                        : isEditing
                                            ? 'Save and publish'
                                            : 'Create and publish'}
                                    {!isSubmitting && <Icon icon={sendIcon} aria-hidden="true"/>}
                                </button>
                            )}

                            <Link
                                className="quiet-link"
                                to="/dashboard"
                            >
                                Cancel
                            </Link>

                            {post && (
                                <button
                                    className="button button--danger button--small"
                                    type="button"
                                    onClick={() => {
                                        void handleDelete()
                                    }}
                                    disabled={formIsDisabled}
                                >
                                    <Icon icon={trashIcon} aria-hidden="true"/>{isDeleting ? 'Deleting…' : 'Delete post'}
                                </button>
                            )}
                        </div>
                    </form>

                    {post ? (
                        <div className="editor-blocks-area">
                            <PostBlocksEditor
                                postId={post.id}
                                onPostEdited={handleContentEdited}
                            />
                        </div>
                    ) : (
                        <div className="editor-blocks-locked">
                            <div aria-hidden="true"><Icon icon={layersIcon}/></div>
                            <div><p className="section-eyebrow">Next step</p><h2>Build with content blocks</h2><p>Create the draft first, then reopen it to arrange text, images, videos, quotes, and dividers.</p></div>
                            </div>
                    )}
            </div>
        </section>
    )
}
