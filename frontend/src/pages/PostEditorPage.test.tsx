import {
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom'
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
  createAuthorPost,
  deleteAuthorPost,
  getAuthorPost,
  getAuthorPostBlocks,
  getCategories,
  getTags,
  publishAuthorPost,
  updateAuthorPost,
  type AuthorPostDetail,
  type Category,
  type Tag,
} from '../api/posts'
import { PostEditorPage } from './PostEditorPage'

vi.mock('../api/posts', () => ({
  createAuthorPost: vi.fn(),
  deleteAuthorPost: vi.fn(),
  getAuthorPost: vi.fn(),
  getAuthorPostBlocks: vi.fn(),
  getCategories: vi.fn(),
  getTags: vi.fn(),
  publishAuthorPost: vi.fn(),
  updateAuthorPost: vi.fn(),
}))

const createAuthorPostMock = vi.mocked(createAuthorPost)
const deleteAuthorPostMock = vi.mocked(deleteAuthorPost)
const getAuthorPostMock = vi.mocked(getAuthorPost)
const getAuthorPostBlocksMock = vi.mocked(getAuthorPostBlocks)
const getCategoriesMock = vi.mocked(getCategories)
const getTagsMock = vi.mocked(getTags)
const publishAuthorPostMock = vi.mocked(publishAuthorPost)
const updateAuthorPostMock = vi.mocked(updateAuthorPost)

const categories: Category[] = [
  { id: 3, name: 'Development', slug: 'development' },
  { id: 4, name: 'Design', slug: 'design' },
]

const tags: Tag[] = [
  { id: 5, name: 'Django', slug: 'django' },
  { id: 8, name: 'React', slug: 'react' },
]

const authorPost: AuthorPostDetail = {
  id: 20,
  title: 'My unfinished article',
  slug: 'my-unfinished-article',
  excerpt: 'A draft introduction.',
  content: 'The current draft body.',
  category: 3,
  tags: [5],
  featured_image: null,
  featured_image_alt: '',
  post_type: 'article',
  allow_comments: true,
  meta_title: 'My search title',
  meta_description: 'My search description.',
  status: 'removed',
  review_feedback: 'Please include the missing source.',
  published_at: null,
  date_posted: '2026-07-29T08:00:00Z',
  updated_at: '2026-07-30T10:15:00Z',
}

function renderEditor(path = '/dashboard/posts/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/dashboard/posts/new"
          element={<PostEditorPage />}
        />
        <Route
          path="/dashboard/posts/:postId/edit"
          element={<PostEditorPage />}
        />
        <Route
          path="/dashboard"
          element={<h1>Dashboard destination</h1>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PostEditorPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getCategoriesMock.mockResolvedValue(categories)
    getTagsMock.mockResolvedValue(tags)
    getAuthorPostMock.mockResolvedValue(authorPost)
    getAuthorPostBlocksMock.mockResolvedValue([])
    createAuthorPostMock.mockResolvedValue({
      ...authorPost,
      status: 'draft',
      review_feedback: '',
    })
    updateAuthorPostMock.mockResolvedValue({
      ...authorPost,
      status: 'draft',
      review_feedback: '',
    })
    publishAuthorPostMock.mockResolvedValue({
      ...authorPost,
      status: 'published',
      review_feedback: '',
    })
    deleteAuthorPostMock.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads reference choices for a new draft', async () => {
    renderEditor()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading post editor…',
    )
    expect(
      await screen.findByRole('heading', { name: 'New post' }),
    ).toBeInTheDocument()
    expect(getCategoriesMock).toHaveBeenCalledOnce()
    expect(getTagsMock).toHaveBeenCalledOnce()
    expect(getAuthorPostMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Title')).toBeRequired()
    expect(screen.getByLabelText('Category')).toHaveTextContent(
      'Development',
    )
    expect(screen.getByLabelText('Django')).not.toBeChecked()
    expect(
      screen.getByRole('button', {
        name: 'Create and publish',
      }),
    ).toBeEnabled()
  })

  it('creates a draft with the selected metadata', async () => {
    const user = userEvent.setup()
    renderEditor()

    await screen.findByRole('heading', { name: 'New post' })
    await user.type(screen.getByLabelText('Title'), 'A new guide')
    await user.type(
      screen.getByLabelText('Excerpt'),
      'A concise summary.',
    )
    await user.type(
      screen.getByLabelText('Introduction or body'),
      'The opening section.',
    )
    await user.selectOptions(screen.getByLabelText('Post type'), 'tutorial')
    await user.selectOptions(screen.getByLabelText('Category'), '4')
    await user.click(screen.getByLabelText('React'))
    await user.click(
      screen.getByLabelText('Allow comments after publication'),
    )
    await user.type(
      screen.getByLabelText('Search title'),
      'A searchable guide',
    )

    await user.click(
      screen.getByRole('button', { name: 'Create draft' }),
    )

    expect(createAuthorPostMock).toHaveBeenCalledWith({
      title: 'A new guide',
      excerpt: 'A concise summary.',
      content: 'The opening section.',
      category: 4,
      tags: [8],
      featured_image_alt: '',
      post_type: 'tutorial',
      allow_comments: false,
      meta_title: 'A searchable guide',
      meta_description: '',
    })
    expect(
      await screen.findByRole('heading', {
        name: 'Dashboard destination',
      }),
    ).toBeInTheDocument()
  })

  it('loads, updates, and immediately republishes a removed post', async () => {
    const user = userEvent.setup()
    renderEditor('/dashboard/posts/20/edit')

    expect(
      await screen.findByRole('heading', { name: 'Edit post' }),
    ).toBeInTheDocument()
    expect(getAuthorPostMock).toHaveBeenCalledWith(20)
    expect(screen.getByLabelText('Title')).toHaveValue(
      'My unfinished article',
    )
    expect(screen.getByLabelText('Category')).toHaveValue('3')
    expect(screen.getByLabelText('Django')).toBeChecked()
    expect(screen.getByText('removed')).toBeInTheDocument()
    expect(
      screen.getByText('Please include the missing source.'),
    ).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Revised article')
    await user.click(screen.getByLabelText('React'))
    await user.click(
      screen.getByRole('button', {
        name: 'Save and publish',
      }),
    )

    expect(updateAuthorPostMock).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        title: 'Revised article',
        tags: [5, 8],
      }),
    )
    expect(publishAuthorPostMock).toHaveBeenCalledWith(20)
    expect(
      await screen.findByRole('heading', {
        name: 'Dashboard destination',
      }),
    ).toBeInTheDocument()
  })

  it('shows and clears server field validation errors', async () => {
    createAuthorPostMock.mockRejectedValue(
      new ApiError(
        'Request failed with status 400.',
        400,
        { title: ['Choose a more specific title.'] },
      ),
    )
    const user = userEvent.setup()
    renderEditor()

    await screen.findByRole('heading', { name: 'New post' })
    await user.type(screen.getByLabelText('Title'), 'Draft')
    await user.click(
      screen.getByRole('button', { name: 'Create draft' }),
    )

    expect(
      await screen.findByText('Choose a more specific title.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await user.type(screen.getByLabelText('Title'), ' revised')

    expect(
      screen.queryByText('Choose a more specific title.'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute(
      'aria-invalid',
      'false',
    )
  })

  it('shows a load failure and retries all editor data', async () => {
    getCategoriesMock
      .mockRejectedValueOnce(new Error('Categories are unavailable.'))
      .mockResolvedValueOnce(categories)
    const user = userEvent.setup()
    renderEditor()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Categories are unavailable.',
    )

    await user.click(
      screen.getByRole('button', { name: 'Try again' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'New post' }),
    ).toBeInTheDocument()
    expect(getCategoriesMock).toHaveBeenCalledTimes(2)
    expect(getTagsMock).toHaveBeenCalledTimes(2)
  })

  it('requires confirmation before deleting an existing post', async () => {
    const confirmMock = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirmMock)
    const user = userEvent.setup()
    renderEditor('/dashboard/posts/20/edit')

    await screen.findByRole('heading', { name: 'Edit post' })
    await user.click(
      screen.getByRole('button', { name: 'Delete post' }),
    )

    expect(deleteAuthorPostMock).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: 'Delete post' }),
    )

    expect(confirmMock).toHaveBeenCalledWith(
      'Delete “My unfinished article”? This cannot be undone.',
    )
    expect(deleteAuthorPostMock).toHaveBeenCalledWith(20)
    expect(
      await screen.findByRole('heading', {
        name: 'Dashboard destination',
      }),
    ).toBeInTheDocument()
  })

  it('rejects an invalid edit URL without calling the API', async () => {
    renderEditor('/dashboard/posts/not-a-number/edit')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This post address is invalid.',
    )
    expect(getCategoriesMock).not.toHaveBeenCalled()
    expect(getTagsMock).not.toHaveBeenCalled()
    expect(getAuthorPostMock).not.toHaveBeenCalled()
    expect(
      screen.getByRole('link', { name: 'Back to dashboard' }),
    ).toHaveAttribute('href', '/dashboard')
  })
})
