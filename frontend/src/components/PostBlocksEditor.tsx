import {
    useEffect,
    useState,
} from 'react'

import {getApiErrorMessage} from '../api/errors'
import {
    deleteAuthorPostBlock,
    getAuthorPostBlocks,
    reorderAuthorPostBlocks,
    type AuthorPostBlock,
    type PostBlockType,
} from '../api/posts'
import {PostBlockForm} from './PostBlockForm'
import {PostContentBlock} from './PostContentBlock'

const BLOCK_TYPE_LABELS: Record<PostBlockType, string> = {
    rich_text: 'Rich text',
    image: 'Image',
    video: 'Video',
    quote: 'Quote',
    divider: 'Divider',
}

function sortBlocks(blocks: AuthorPostBlock[]): AuthorPostBlock[] {
    return [...blocks].sort(
        (first, second) =>
            first.position - second.position ||
            first.id - second.id,
    )
}

interface PostBlocksEditorProps {
    postId: number
    onPostEdited: () => void
}

type ActiveEditor = number | 'new' | null

export function PostBlocksEditor({
    postId,
    onPostEdited,
}: PostBlocksEditorProps) {
    const [blocks, setBlocks] =
        useState<AuthorPostBlock[] | null>(null)
    const [loadError, setLoadError] =
        useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [activeEditor, setActiveEditor] =
        useState<ActiveEditor>(null)
    const [operationError, setOperationError] =
        useState<string | null>(null)
    const [busyBlockId, setBusyBlockId] =
        useState<number | null>(null)
    const [isReordering, setIsReordering] = useState(false)

    useEffect(() => {
        let isCancelled = false

        async function loadBlocks() {
            setBlocks(null)
            setLoadError(null)
            setOperationError(null)

            try {
                const response = await getAuthorPostBlocks(postId)

                if (!isCancelled) {
                    setBlocks(sortBlocks(response))
                }
            } catch (error) {
                if (!isCancelled) {
                    setLoadError(
                        getApiErrorMessage(
                            error,
                            'Unable to load content blocks.',
                        ),
                    )
                }
            }
        }

        void loadBlocks()

        return () => {
            isCancelled = true
        }
    }, [postId, reloadKey])

    function handleSavedBlock(savedBlock: AuthorPostBlock) {
        setBlocks((currentBlocks) => {
            if (!currentBlocks) {
                return [savedBlock]
            }

            const blockExists = currentBlocks.some(
                (block) => block.id === savedBlock.id,
            )
            const nextBlocks = blockExists
                ? currentBlocks.map((block) =>
                    block.id === savedBlock.id
                        ? savedBlock
                        : block,
                )
                : [...currentBlocks, savedBlock]

            return sortBlocks(nextBlocks)
        })
        setActiveEditor(null)
        setOperationError(null)
        onPostEdited()
    }

    async function handleMove(blockIndex: number, direction: -1 | 1) {
        if (!blocks || isReordering || busyBlockId !== null) {
            return
        }

        const destinationIndex = blockIndex + direction

        if (
            destinationIndex < 0 ||
            destinationIndex >= blocks.length
        ) {
            return
        }

        const nextBlocks = [...blocks]
        const [movedBlock] = nextBlocks.splice(blockIndex, 1)
        nextBlocks.splice(destinationIndex, 0, movedBlock)
        setOperationError(null)
        setIsReordering(true)

        try {
            const reorderedBlocks = await reorderAuthorPostBlocks(
                postId,
                nextBlocks.map((block) => block.id),
            )
            setBlocks(sortBlocks(reorderedBlocks))
            onPostEdited()
        } catch (error) {
            setOperationError(
                getApiErrorMessage(
                    error,
                    'Unable to reorder content blocks.',
                ),
            )
        } finally {
            setIsReordering(false)
        }
    }

    async function handleDelete(block: AuthorPostBlock) {
        if (busyBlockId !== null || isReordering) {
            return
        }

        const shouldDelete = window.confirm(
            `Delete this ${BLOCK_TYPE_LABELS[
                block.block_type
            ].toLowerCase()} block?`,
        )

        if (!shouldDelete) {
            return
        }

        setOperationError(null)
        setBusyBlockId(block.id)

        try {
            await deleteAuthorPostBlock(postId, block.id)
            setBlocks((currentBlocks) =>
                currentBlocks?.filter(
                    (currentBlock) =>
                        currentBlock.id !== block.id,
                ) ?? [],
            )
            setActiveEditor((currentEditor) =>
                currentEditor === block.id ? null : currentEditor,
            )
            onPostEdited()
        } catch (error) {
            setOperationError(
                getApiErrorMessage(
                    error,
                    'Unable to delete this content block.',
                ),
            )
        } finally {
            setBusyBlockId(null)
        }
    }

    if (blocks === null && !loadError) {
        return (
            <section className="card shadow-sm mb-4">
                <div className="card-body p-4" role="status">
                    Loading content blocks…
                </div>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="card shadow-sm mb-4">
                <div className="card-body p-4">
                    <h2 className="h4">Content blocks</h2>
                    <div className="alert alert-danger" role="alert">
                        <p>{loadError}</p>
                        <button
                            className="btn btn-outline-danger"
                            type="button"
                            onClick={() => {
                                setReloadKey((current) => current + 1)
                            }}
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </section>
        )
    }

    const orderedBlocks = blocks ?? []
    const nextPosition =
        orderedBlocks.length === 0
            ? 0
            : Math.max(
                ...orderedBlocks.map((block) => block.position),
            ) + 1
    const controlsAreDisabled =
        isReordering || busyBlockId !== null

    return (
        <section className="card shadow-sm mb-4">
            <div className="card-body p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                    <div>
                        <h2 className="h4 mb-2">Content blocks</h2>
                        <p className="text-secondary mb-0">
                            Build the main article from ordered text, image, video, quote, and divider blocks.
                        </p>
                    </div>

                    {activeEditor === null && (
                        <button
                            className="btn btn-outline-primary"
                            type="button"
                            onClick={() => {
                                setActiveEditor('new')
                                setOperationError(null)
                            }}
                            disabled={controlsAreDisabled}
                        >
                            Add block
                        </button>
                    )}
                </div>

                {operationError && (
                    <div className="alert alert-danger" role="alert">
                        {operationError}
                    </div>
                )}

                {orderedBlocks.length === 0 && activeEditor !== 'new' && (
                    <div className="text-center border rounded p-4 mb-3">
                        <p className="text-secondary mb-0">
                            No content blocks yet. Add one to build the article body.
                        </p>
                    </div>
                )}

                <div className="d-grid gap-3">
                    {orderedBlocks.map((block, index) => (
                        <article
                            className="border rounded p-3"
                            key={block.id}
                            aria-label={`Content block ${index + 1}`}
                        >
                            {activeEditor === block.id ? (
                                <PostBlockForm
                                    postId={postId}
                                    block={block}
                                    position={block.position}
                                    onSaved={handleSavedBlock}
                                    onCancel={() => {
                                        setActiveEditor(null)
                                    }}
                                />
                            ) : (
                                <>
                                    <header className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                                        <h3 className="h6 mb-0">
                                            Block {index + 1} ·{' '}
                                            {BLOCK_TYPE_LABELS[
                                                block.block_type
                                            ]}
                                        </h3>

                                        <div className="d-flex flex-wrap gap-2">
                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                type="button"
                                                aria-label={`Move block ${index + 1} up`}
                                                onClick={() => {
                                                    void handleMove(index, -1)
                                                }}
                                                disabled={
                                                    controlsAreDisabled ||
                                                    activeEditor !== null ||
                                                    index === 0
                                                }
                                            >
                                                Move up
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                type="button"
                                                aria-label={`Move block ${index + 1} down`}
                                                onClick={() => {
                                                    void handleMove(index, 1)
                                                }}
                                                disabled={
                                                    controlsAreDisabled ||
                                                    activeEditor !== null ||
                                                    index ===
                                                        orderedBlocks.length - 1
                                                }
                                            >
                                                Move down
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                type="button"
                                                aria-label={`Edit block ${index + 1}`}
                                                onClick={() => {
                                                    setActiveEditor(block.id)
                                                    setOperationError(null)
                                                }}
                                                disabled={
                                                    controlsAreDisabled ||
                                                    activeEditor !== null
                                                }
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                type="button"
                                                aria-label={`Delete block ${index + 1}`}
                                                onClick={() => {
                                                    void handleDelete(block)
                                                }}
                                                disabled={
                                                    controlsAreDisabled ||
                                                    activeEditor !== null
                                                }
                                            >
                                                {busyBlockId === block.id
                                                    ? 'Deleting…'
                                                    : 'Delete'}
                                            </button>
                                        </div>
                                    </header>

                                    <div className="border-top pt-2">
                                        <PostContentBlock block={block}/>
                                    </div>
                                </>
                            )}
                        </article>
                    ))}
                </div>

                {activeEditor === 'new' && (
                    <div className="mt-3">
                        <PostBlockForm
                            postId={postId}
                            position={nextPosition}
                            onSaved={handleSavedBlock}
                            onCancel={() => {
                                setActiveEditor(null)
                            }}
                        />
                    </div>
                )}
            </div>
        </section>
    )
}
