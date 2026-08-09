import {
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { ApiError } from '../api/client'
import {
  createAuthorPostBlock,
  deleteAuthorPostBlock,
  getAuthorPostBlocks,
  reorderAuthorPostBlocks,
  updateAuthorPostBlock,
  type AuthorPostBlock,
} from '../api/posts'
import { PostBlocksEditor } from './PostBlocksEditor'

vi.mock('../api/posts', () => ({
  createAuthorPostBlock: vi.fn(),
  deleteAuthorPostBlock: vi.fn(),
  getAuthorPostBlocks: vi.fn(),
  reorderAuthorPostBlocks: vi.fn(),
  updateAuthorPostBlock: vi.fn(),
}))

const createAuthorPostBlockMock = vi.mocked(
  createAuthorPostBlock,
)
const deleteAuthorPostBlockMock = vi.mocked(
  deleteAuthorPostBlock,
)
const getAuthorPostBlocksMock = vi.mocked(
  getAuthorPostBlocks,
)
const reorderAuthorPostBlocksMock = vi.mocked(
  reorderAuthorPostBlocks,
)
const updateAuthorPostBlockMock = vi.mocked(
  updateAuthorPostBlock,
)

const richTextBlock: AuthorPostBlock = {
  id: 41,
  block_type: 'rich_text',
  position: 0,
  content: '<h2>First section</h2><p>Opening text.</p>',
  image: null,
  image_alt: '',
  caption: '',
  image_width: 'content',
  video_url: '',
  quote_attribution: '',
  created_at: '2026-07-30T10:00:00Z',
  updated_at: '2026-07-30T10:15:00Z',
}

const quoteBlock: AuthorPostBlock = {
  id: 42,
  block_type: 'quote',
  position: 1,
  content: 'Make the workflow explicit.',
  image: null,
  image_alt: '',
  caption: '',
  image_width: 'content',
  video_url: '',
  quote_attribution: 'ThoughtHub editor',
  created_at: '2026-07-30T10:05:00Z',
  updated_at: '2026-07-30T10:20:00Z',
}

function renderBlockEditor(onPostEdited = vi.fn()) {
  return {
    onPostEdited,
    ...render(
      <PostBlocksEditor
        postId={20}
        onPostEdited={onPostEdited}
      />,
    ),
  }
}

describe('PostBlocksEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getAuthorPostBlocksMock.mockResolvedValue([
      richTextBlock,
      quoteBlock,
    ])
    createAuthorPostBlockMock.mockResolvedValue(richTextBlock)
    updateAuthorPostBlockMock.mockResolvedValue(quoteBlock)
    deleteAuthorPostBlockMock.mockResolvedValue(null)
    reorderAuthorPostBlocksMock.mockResolvedValue([
      richTextBlock,
      quoteBlock,
    ])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads and previews ordered content blocks', async () => {
    renderBlockEditor()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading content blocks…',
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Content blocks',
      }),
    ).toBeInTheDocument()
    expect(getAuthorPostBlocksMock).toHaveBeenCalledWith(20)
    expect(
      screen.getByRole('heading', { name: 'First section' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Make the workflow explicit.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Move block 1 up' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Move block 2 down' }),
    ).toBeDisabled()
  })

  it('adds a rich text block at the end', async () => {
    getAuthorPostBlocksMock.mockResolvedValue([])
    const savedBlock: AuthorPostBlock = {
      ...richTextBlock,
      id: 50,
      content: '<p>New final section.</p>',
    }
    createAuthorPostBlockMock.mockResolvedValue(savedBlock)
    const user = userEvent.setup()
    const { onPostEdited } = renderBlockEditor()

    await screen.findByText(
      'No content blocks yet. Add one to build the article body.',
    )
    await user.click(
      screen.getByRole('button', { name: 'Add block' }),
    )
    await user.type(
      screen.getByLabelText('Rich text HTML'),
      '<p>New final section.</p>',
    )
    await user.click(
      screen.getByRole('button', { name: 'Save block' }),
    )

    expect(createAuthorPostBlockMock).toHaveBeenCalledWith(20, {
      block_type: 'rich_text',
      position: 0,
      content: '<p>New final section.</p>',
      image: null,
      image_alt: '',
      caption: '',
      image_width: 'content',
      video_url: '',
      quote_attribution: '',
    })
    expect(
      await screen.findByText('New final section.'),
    ).toBeInTheDocument()
    expect(onPostEdited).toHaveBeenCalledOnce()
  })

  it('uploads an accessible image block', async () => {
    getAuthorPostBlocksMock.mockResolvedValue([])
    const imageFile = new File(['image'], 'architecture.png', {
      type: 'image/png',
    })
    const savedImage: AuthorPostBlock = {
      ...richTextBlock,
      id: 51,
      block_type: 'image',
      content: '',
      image: '/media/posts/blocks/architecture.png',
      image_alt: 'Application request flow',
      caption: 'Django and React communication',
      image_width: 'wide',
    }
    createAuthorPostBlockMock.mockResolvedValue(savedImage)
    const user = userEvent.setup()
    renderBlockEditor()

    await screen.findByRole('button', { name: 'Add block' })
    await user.click(
      screen.getByRole('button', { name: 'Add block' }),
    )
    await user.selectOptions(
      screen.getByLabelText('Block type'),
      'image',
    )
    await user.upload(screen.getByLabelText('Image file'), imageFile)
    await user.type(
      screen.getByLabelText('Alternative text'),
      'Application request flow',
    )
    await user.type(
      screen.getByLabelText('Caption'),
      'Django and React communication',
    )
    await user.selectOptions(
      screen.getByLabelText('Image width'),
      'wide',
    )
    expect(screen.getByLabelText('Image file')).toBeValid()
    expect(screen.getByLabelText('Alternative text')).toBeValid()
    await user.click(
      screen.getByRole('button', { name: 'Save block' }),
    )

    expect(createAuthorPostBlockMock).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        block_type: 'image',
        image: imageFile,
        image_alt: 'Application request flow',
        caption: 'Django and React communication',
        image_width: 'wide',
      }),
    )
    expect(
      await screen.findByRole('img', {
        name: 'Application request flow',
      }),
    ).toBeInTheDocument()
  })

  it('edits an existing quote block', async () => {
    const updatedQuote = {
      ...quoteBlock,
      content: 'Make each state explicit.',
      quote_attribution: 'Editorial team',
    }
    updateAuthorPostBlockMock.mockResolvedValue(updatedQuote)
    const user = userEvent.setup()
    const { onPostEdited } = renderBlockEditor()

    await screen.findByText('Make the workflow explicit.')
    await user.click(
      screen.getByRole('button', { name: 'Edit block 2' }),
    )
    await user.clear(screen.getByLabelText('Quote'))
    await user.type(
      screen.getByLabelText('Quote'),
      'Make each state explicit.',
    )
    await user.clear(screen.getByLabelText('Attribution'))
    await user.type(
      screen.getByLabelText('Attribution'),
      'Editorial team',
    )
    await user.click(
      screen.getByRole('button', { name: 'Save block' }),
    )

    expect(updateAuthorPostBlockMock).toHaveBeenCalledWith(
      20,
      42,
      expect.objectContaining({
        position: 1,
        content: 'Make each state explicit.',
        quote_attribution: 'Editorial team',
      }),
    )
    expect(
      await screen.findByText('Make each state explicit.'),
    ).toBeInTheDocument()
    expect(onPostEdited).toHaveBeenCalledOnce()
  })

  it('maps server validation errors and clears them on edit', async () => {
    getAuthorPostBlocksMock.mockResolvedValue([])
    createAuthorPostBlockMock.mockRejectedValue(
      new ApiError(
        'Request failed with status 400.',
        400,
        { content: ['Add more useful content.'] },
      ),
    )
    const user = userEvent.setup()
    renderBlockEditor()

    await screen.findByRole('button', { name: 'Add block' })
    await user.click(
      screen.getByRole('button', { name: 'Add block' }),
    )
    await user.type(screen.getByLabelText('Rich text HTML'), 'Short')
    await user.click(
      screen.getByRole('button', { name: 'Save block' }),
    )

    expect(
      await screen.findByText('Add more useful content.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Rich text HTML')).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await user.type(screen.getByLabelText('Rich text HTML'), ' details')

    expect(
      screen.queryByText('Add more useful content.'),
    ).not.toBeInTheDocument()
  })

  it('atomically moves a block and adopts server positions', async () => {
    const reorderedBlocks = [
      {...quoteBlock, position: 0},
      {...richTextBlock, position: 1},
    ]
    reorderAuthorPostBlocksMock.mockResolvedValue(reorderedBlocks)
    const user = userEvent.setup()
    const { onPostEdited } = renderBlockEditor()

    await screen.findByText('Make the workflow explicit.')
    await user.click(
      screen.getByRole('button', { name: 'Move block 1 down' }),
    )

    expect(reorderAuthorPostBlocksMock).toHaveBeenCalledWith(
      20,
      [42, 41],
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Block 1 · Quote',
        }),
      ).toBeInTheDocument()
    })
    expect(onPostEdited).toHaveBeenCalledOnce()
  })

  it('confirms before deleting a block', async () => {
    const confirmMock = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirmMock)
    const user = userEvent.setup()
    const { onPostEdited } = renderBlockEditor()

    await screen.findByText('Make the workflow explicit.')
    await user.click(
      screen.getByRole('button', { name: 'Delete block 2' }),
    )
    expect(deleteAuthorPostBlockMock).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: 'Delete block 2' }),
    )

    expect(confirmMock).toHaveBeenCalledWith(
      'Delete this quote block?',
    )
    expect(deleteAuthorPostBlockMock).toHaveBeenCalledWith(20, 42)
    await waitFor(() => {
      expect(
        screen.queryByText('Make the workflow explicit.'),
      ).not.toBeInTheDocument()
    })
    expect(onPostEdited).toHaveBeenCalledOnce()
  })

  it('shows a load failure and retries the block request', async () => {
    getAuthorPostBlocksMock
      .mockRejectedValueOnce(new Error('Blocks are unavailable.'))
      .mockResolvedValueOnce([])
    const user = userEvent.setup()
    renderBlockEditor()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Blocks are unavailable.',
    )
    await user.click(
      screen.getByRole('button', { name: 'Try again' }),
    )

    expect(
      await screen.findByText(
        'No content blocks yet. Add one to build the article body.',
      ),
    ).toBeInTheDocument()
    expect(getAuthorPostBlocksMock).toHaveBeenCalledTimes(2)
  })
})
