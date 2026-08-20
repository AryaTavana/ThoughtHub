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
import {getTextDirection} from '../textDirection'

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
    const wordCount = formData.content.trim()
        ? formData.content.trim().split(/\s+/).length
        : 0
    const completedStorySteps = [
        formData.title.trim(),
        formData.excerpt.trim(),
        formData.content.trim(),
    ].filter(Boolean).length
    const completionPercentage = Math.round(
        (completedStorySteps / 3) * 100,
    )
    const searchPreviewTitle =
        formData.meta_title.trim() ||
        formData.title.trim() ||
        'Your post title will appear here'
    const searchPreviewDescription =
        formData.meta_description.trim() ||
        formData.excerpt.trim() ||
        'Add an excerpt or search description to preview how readers may discover this post.'
    const searchPreviewSlug = formData.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'your-new-post'

    return (
        <section className="app-shell editor-page">
            <div className="editor-workspace">
                <header className="editor-header">
                    <div className="editor-header__topline">
                        <Link className="editor-header__back" to="/dashboard">
                            <Icon icon={arrowLeftIcon} aria-hidden="true"/>
                            Dashboard
                        </Link>
                        {post && (
                            <span className={`status-badge status-badge--${post.status}`}>
                                {post.status.replace('_', ' ')}
                            </span>
                        )}
                    </div>
                    <div className="editor-header__hero">
                        <div className="editor-header__copy">
                            <p className="section-eyebrow">Writer workspace</p>
                            <h1>{isEditing ? 'Edit post' : 'New post'}</h1>
                            <p>
                                {isEditing
                                    ? 'Refine the story, tune its settings, and publish when it feels ready.'
                                    : 'Turn an early thought into something worth sharing.'}
                            </p>
                        </div>
                        <aside className="editor-readiness" aria-label="Story checklist">
                            <div className="editor-readiness__top">
                                <div>
                                    <span>Story checklist</span>
                                    <strong>{completedStorySteps} of 3 essentials</strong>
                                </div>
                                <b>{completionPercentage}%</b>
                            </div>
                            <div className="editor-readiness__track" aria-hidden="true">
                                <span style={{width: `${completionPercentage}%`}}/>
                            </div>
                            <p>Title, excerpt, and opening story</p>
                        </aside>
                    </div>
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
                    className="editor-form"
                    onSubmit={handleSubmit}
                    aria-busy={formIsDisabled}
                >
                    <div className="editor-layout">
                        <div className="editor-main-column">
                            <section className="editor-canvas" aria-labelledby="story-canvas-title">
                                <div className="editor-canvas__toolbar">
                                    <div>
                                        <span className="editor-canvas__mark" aria-hidden="true">
                                            <Icon icon={fileTextIcon}/>
                                        </span>
                                        <div>
                                            <p className="section-eyebrow">Story canvas</p>
                                            <h2 id="story-canvas-title">Start with the idea</h2>
                                        </div>
                                    </div>
                                    <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                                </div>

                                <div className="editor-title-field">
                                    <label className="visually-hidden" htmlFor="post-title">Title</label>
                                    <input
                                        id="post-title"
                                        className={`editor-title-input ${fieldErrors.title ? 'is-invalid' : ''}`}
                                        name="title"
                                        value={formData.title}
                                        dir={getTextDirection(formData.title)}
                                        onChange={handleTextChange}
                                        maxLength={200}
                                        placeholder="Give your idea a title…"
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(fieldErrors.title)}
                                        aria-describedby={fieldErrors.title ? 'post-title-error' : undefined}
                                        required
                                    />
                                    <FieldError field="title" messages={fieldErrors.title}/>
                                </div>

                                <div className="editor-excerpt-field">
                                    <div className="editor-field-heading">
                                        <label htmlFor="post-excerpt">Excerpt</label>
                                        <span>{formData.excerpt.length}/500</span>
                                    </div>
                                    <textarea
                                        id="post-excerpt"
                                        className={`form-control ${fieldErrors.excerpt ? 'is-invalid' : ''}`}
                                        name="excerpt"
                                        value={formData.excerpt}
                                        dir={getTextDirection(formData.excerpt)}
                                        onChange={handleTextChange}
                                        maxLength={500}
                                        rows={3}
                                        placeholder="Write the one-sentence promise that makes readers want to continue…"
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(fieldErrors.excerpt)}
                                        aria-describedby={fieldErrors.excerpt ? 'post-excerpt-error' : 'post-excerpt-help'}
                                    />
                                    <p className="form-text" id="post-excerpt-help">This appears on post cards and in link previews.</p>
                                    <FieldError field="excerpt" messages={fieldErrors.excerpt}/>
                                </div>

                                <div className="editor-body-field">
                                    <div className="editor-field-heading">
                                        <label htmlFor="post-content">Introduction or body</label>
                                        <span>Plain text</span>
                                    </div>
                                    <textarea
                                        id="post-content"
                                        className={`form-control ${fieldErrors.content ? 'is-invalid' : ''}`}
                                        name="content"
                                        value={formData.content}
                                        dir={getTextDirection(formData.content)}
                                        onChange={handleTextChange}
                                        rows={15}
                                        placeholder="Set the scene. What should your reader understand, feel, or do next?"
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(fieldErrors.content)}
                                        aria-describedby={fieldErrors.content ? 'post-content-error' : 'post-content-help'}
                                    />
                                    <div className="editor-body-field__foot" id="post-content-help">
                                        <span>Use this as your opening or complete first draft.</span>
                                        <span>Content blocks unlock after the draft is created.</span>
                                    </div>
                                    <FieldError field="content" messages={fieldErrors.content}/>
                                </div>
                            </section>

                            <section className="editor-search-card" aria-labelledby="search-preview-title">
                                <div className="editor-side-card__heading">
                                    <span aria-hidden="true"><Icon icon={searchIcon}/></span>
                                    <div>
                                        <p className="section-eyebrow">Discoverability</p>
                                        <h2 id="search-preview-title">Search preview</h2>
                                    </div>
                                </div>
                                <div className="editor-search-preview" aria-live="polite">
                                    <span>thoughthub.com › posts › {searchPreviewSlug}</span>
                                    <strong dir={getTextDirection(searchPreviewTitle)}>{searchPreviewTitle}</strong>
                                    <p dir={getTextDirection(searchPreviewDescription)}>{searchPreviewDescription}</p>
                                </div>
                                <div className="editor-search-fields">
                                    <div>
                                        <div className="editor-field-heading">
                                            <label htmlFor="post-meta-title">Search title</label>
                                            <span>{formData.meta_title.length}/60</span>
                                        </div>
                                        <input
                                            id="post-meta-title"
                                            className={`form-control ${fieldErrors.meta_title ? 'is-invalid' : ''}`}
                                            name="meta_title"
                                            value={formData.meta_title}
                                            dir={getTextDirection(formData.meta_title)}
                                            onChange={handleTextChange}
                                            maxLength={60}
                                            placeholder="Optional custom search title"
                                            disabled={formIsDisabled}
                                            aria-invalid={Boolean(fieldErrors.meta_title)}
                                            aria-describedby={fieldErrors.meta_title ? 'post-meta_title-error' : undefined}
                                        />
                                        <FieldError field="meta_title" messages={fieldErrors.meta_title}/>
                                    </div>
                                    <div>
                                        <div className="editor-field-heading">
                                            <label htmlFor="post-meta-description">Search description</label>
                                            <span>{formData.meta_description.length}/160</span>
                                        </div>
                                        <textarea
                                            id="post-meta-description"
                                            className={`form-control ${fieldErrors.meta_description ? 'is-invalid' : ''}`}
                                            name="meta_description"
                                            value={formData.meta_description}
                                            dir={getTextDirection(formData.meta_description)}
                                            onChange={handleTextChange}
                                            maxLength={160}
                                            rows={3}
                                            placeholder="Optional description for search results"
                                            disabled={formIsDisabled}
                                            aria-invalid={Boolean(fieldErrors.meta_description)}
                                            aria-describedby={fieldErrors.meta_description ? 'post-meta_description-error' : undefined}
                                        />
                                        <FieldError field="meta_description" messages={fieldErrors.meta_description}/>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <aside className="editor-settings-column" aria-label="Post settings">
                            <section className="editor-side-card" aria-labelledby="publish-settings-title">
                                <div className="editor-side-card__heading">
                                    <span aria-hidden="true"><Icon icon={fileTextIcon}/></span>
                                    <div>
                                        <p className="section-eyebrow">Organize</p>
                                        <h2 id="publish-settings-title">Post settings</h2>
                                    </div>
                                </div>
                                <div className="editor-settings-grid">
                                    <div>
                                        <label className="form-label" htmlFor="post-type">Post type</label>
                                        <select
                                            id="post-type"
                                            className={`form-select ${fieldErrors.post_type ? 'is-invalid' : ''}`}
                                            name="post_type"
                                            value={formData.post_type}
                                            onChange={handleTextChange}
                                            disabled={formIsDisabled}
                                            aria-invalid={Boolean(fieldErrors.post_type)}
                                            aria-describedby={fieldErrors.post_type ? 'post-post_type-error' : undefined}
                                        >
                                            {POST_TYPE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        <FieldError field="post_type" messages={fieldErrors.post_type}/>
                                    </div>
                                    <div>
                                        <label className="form-label" htmlFor="post-category">Category</label>
                                        <select
                                            id="post-category"
                                            className={`form-select ${fieldErrors.category ? 'is-invalid' : ''}`}
                                            name="category"
                                            value={formData.category ?? ''}
                                            onChange={handleTextChange}
                                            disabled={formIsDisabled}
                                            aria-invalid={Boolean(fieldErrors.category)}
                                            aria-describedby={fieldErrors.category ? 'post-category-error' : undefined}
                                        >
                                            <option value="">No category</option>
                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>{category.name}</option>
                                            ))}
                                        </select>
                                        <FieldError field="category" messages={fieldErrors.category}/>
                                    </div>
                                </div>

                                <fieldset
                                    className="editor-tags-field"
                                    aria-describedby={fieldErrors.tags ? 'post-tags-error' : undefined}
                                >
                                    <legend className="form-label">Tags</legend>
                                    {tags.length === 0 ? (
                                        <p className="small text-secondary mb-0">No tags are available yet.</p>
                                    ) : (
                                        <div className="editor-tag-list">
                                            {tags.map((tag) => (
                                                <div className="form-check editor-tag-chip" key={tag.id}>
                                                    <input
                                                        id={`post-tag-${tag.id}`}
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        value={tag.id}
                                                        checked={formData.tags.includes(tag.id)}
                                                        onChange={handleTagChange}
                                                        disabled={formIsDisabled}
                                                    />
                                                    <label className="form-check-label" htmlFor={`post-tag-${tag.id}`}>{tag.name}</label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <FieldError field="tags" messages={fieldErrors.tags}/>
                                </fieldset>

                                <div className="editor-comments-setting">
                                    <div>
                                        <strong>Reader discussion</strong>
                                        <span>Allow comments after publication</span>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input
                                            id="post-allow-comments"
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={formData.allow_comments}
                                            onChange={handleCommentsChange}
                                            disabled={formIsDisabled}
                                            aria-invalid={Boolean(fieldErrors.allow_comments)}
                                            aria-describedby={fieldErrors.allow_comments ? 'post-allow_comments-error' : undefined}
                                        />
                                        <label className="visually-hidden" htmlFor="post-allow-comments">Allow comments after publication</label>
                                    </div>
                                    <FieldError field="allow_comments" messages={fieldErrors.allow_comments}/>
                                </div>
                            </section>

                            <section className="editor-side-card" aria-labelledby="post-banner-title">
                                <div className="editor-side-card__heading">
                                    <span aria-hidden="true"><Icon icon={imageIcon}/></span>
                                    <div>
                                        <p className="section-eyebrow">Visual context</p>
                                        <h2 id="post-banner-title">Post banner</h2>
                                    </div>
                                </div>
                                {post?.featured_image && !featuredImageFile ? (
                                    <img
                                        className="editor-featured-image-preview"
                                        src={post.featured_image}
                                        alt={formData.featured_image_alt}
                                    />
                                ) : (
                                    <div className="editor-upload-placeholder" aria-hidden="true">
                                        <Icon icon={imageIcon}/>
                                        <span>16:7 cover</span>
                                    </div>
                                )}
                                <div className="editor-upload-field">
                                    <label className="form-label" htmlFor="post-featured-image">Banner image</label>
                                    <input
                                        id="post-featured-image"
                                        className={`form-control ${fieldErrors.featured_image ? 'is-invalid' : ''}`}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFeaturedImageChange}
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(fieldErrors.featured_image)}
                                        aria-describedby={fieldErrors.featured_image ? 'post-featured_image-error' : 'post-featured-image-help'}
                                    />
                                    <p className="form-text" id="post-featured-image-help">Use a wide JPG, PNG, or WebP image.</p>
                                    {featuredImageFile && (
                                        <p className="editor-featured-image-selection">Selected: {featuredImageFile.name}</p>
                                    )}
                                    <FieldError field="featured_image" messages={fieldErrors.featured_image}/>
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="post-featured-image-alt">Alternative text</label>
                                    <input
                                        id="post-featured-image-alt"
                                        className={`form-control ${fieldErrors.featured_image_alt ? 'is-invalid' : ''}`}
                                        name="featured_image_alt"
                                        value={formData.featured_image_alt}
                                        dir={getTextDirection(formData.featured_image_alt)}
                                        onChange={handleTextChange}
                                        maxLength={200}
                                        placeholder="Describe what the image shows"
                                        disabled={formIsDisabled}
                                        aria-invalid={Boolean(fieldErrors.featured_image_alt)}
                                        aria-describedby={fieldErrors.featured_image_alt ? 'post-featured_image_alt-error' : 'post-featured-image-alt-help'}
                                        required={Boolean(featuredImageFile || post?.featured_image)}
                                    />
                                    <p className="form-text" id="post-featured-image-alt-help">Helps readers who cannot see the image.</p>
                                    <FieldError field="featured_image_alt" messages={fieldErrors.featured_image_alt}/>
                                </div>
                            </section>
                        </aside>
                    </div>

                    <div className="editor-actions">
                        <div className="editor-actions__note">
                            <strong>{isEditing ? 'Save this revision' : 'Your idea stays yours'}</strong>
                            <span>Drafts remain editable until you choose to publish.</span>
                        </div>
                        <Link className="quiet-link" to="/dashboard">Cancel</Link>
                        {post && (
                            <button
                                className="button button--danger button--small"
                                type="button"
                                onClick={() => { void handleDelete() }}
                                disabled={formIsDisabled}
                            >
                                <Icon icon={trashIcon} aria-hidden="true"/>
                                {isDeleting ? 'Deleting…' : 'Delete post'}
                            </button>
                        )}
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
                        <div>
                            <p className="section-eyebrow">After your first save</p>
                            <h2>Shape the story with content blocks</h2>
                            <p>Add rich text, imagery, video, quotes, and dividers once the draft has been created.</p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
