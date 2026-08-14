import {Icon} from '@iconify/react'
import arrowDownIcon from '@iconify-icons/lucide/arrow-down'
import arrowUpIcon from '@iconify-icons/lucide/arrow-up'
import editIcon from '@iconify-icons/lucide/edit-3'
import layersIcon from '@iconify-icons/lucide/layers-3'
import plusIcon from '@iconify-icons/lucide/plus'
import trashIcon from '@iconify-icons/lucide/trash-2'
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
            <section className="content-blocks-panel">
                <div className="content-state content-state--compact" role="status">
                    <span className="loading-ring" aria-hidden="true"/>
                    <p>Loading content blocks…</p>
                </div>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="content-blocks-panel">
                <div>
                    <h2>Content blocks</h2>
                    <div className="app-alert app-alert--danger" role="alert">
                        <p>{loadError}</p>
                        <button
                            className="button button--secondary button--small"
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
        <section className="content-blocks-panel">
            <div>
                <div className="content-blocks-panel__heading">
                    <div className="content-blocks-panel__icon" aria-hidden="true"><Icon icon={layersIcon}/></div>
                    <div>
                        <p className="section-eyebrow">Article builder</p>
                        <h2>Content blocks</h2>
                        <p>
                            Build the main article from ordered text, image, video, quote, and divider blocks.
                        </p>
                    </div>

                    {activeEditor === null && (
                        <button
                            className="button button--primary button--small"
                            type="button"
                            onClick={() => {
                                setActiveEditor('new')
                                setOperationError(null)
                            }}
                            disabled={controlsAreDisabled}
                        >
                            <Icon icon={plusIcon} aria-hidden="true"/> Add block
                        </button>
                    )}
                </div>

                {operationError && (
                    <div className="app-alert app-alert--danger" role="alert">
                        {operationError}
                    </div>
                )}

                {orderedBlocks.length === 0 && activeEditor !== 'new' && (
                    <div className="content-blocks-empty">
                        <Icon icon={layersIcon} aria-hidden="true"/>
                        <div><h3>Your article canvas is empty</h3><p>No content blocks yet. Add one to build the article body.</p></div>
                    </div>
                )}

                <div className="content-block-list">
                    {orderedBlocks.map((block, index) => (
                        <article
                            className="content-block-card"
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
                                    <header>
                                        <div><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>Block {index + 1} · {BLOCK_TYPE_LABELS[block.block_type]}</h3></div>

                                        <div className="content-block-card__actions">
                                            <button
                                                className="block-action"
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
                                                <Icon icon={arrowUpIcon} aria-hidden="true"/><span>Move up</span>
                                            </button>
                                            <button
                                                className="block-action"
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
                                                <Icon icon={arrowDownIcon} aria-hidden="true"/><span>Move down</span>
                                            </button>
                                            <button
                                                className="block-action"
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
                                                <Icon icon={editIcon} aria-hidden="true"/><span>Edit</span>
                                            </button>
                                            <button
                                                className="block-action block-action--danger"
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
                                                    : <><Icon icon={trashIcon} aria-hidden="true"/><span>Delete</span></>}
                                            </button>
                                        </div>
                                    </header>

                                    <div className="content-block-card__preview">
                                        <PostContentBlock block={block}/>
                                    </div>
                                </>
                            )}
                        </article>
                    ))}
                </div>

                {activeEditor === 'new' && (
                    <div className="content-block-new">
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
