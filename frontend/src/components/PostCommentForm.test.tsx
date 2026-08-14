import {
  act,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { CurrentUser } from '../api/auth'
import {
  submitPostComment,
  type SubmittedComment,
} from '../api/comments'
import { ApiError } from '../api/client'
import {
  AuthContext,
  type AuthContextValue,
} from '../auth/auth-context'
import { PostCommentForm } from './PostCommentForm'

vi.mock('../api/comments', () => ({
  submitPostComment: vi.fn(),
}))

const submitPostCommentMock = vi.mocked(submitPostComment)

const currentUser: CurrentUser = {
  id: 7,
  username: 'arya',
  email: 'arya@example.com',
  first_name: 'Arya',
  last_name: 'Tavana',
  is_staff: false,
}

const signedOutAuth: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isInitializing: false,
  initializationError: null,
  login: vi.fn(),
  register: vi.fn(),
  updateProfile: vi.fn(),
  logout: vi.fn(),
}

const signedInAuth: AuthContextValue = {
  ...signedOutAuth,
  user: currentUser,
  isAuthenticated: true,
}

const publishedComment: SubmittedComment = {
  id: 20,
  author_username: 'arya',
  content: 'A thoughtful response.',
  status: 'approved',
  moderation_feedback: '',
  created_at: '2026-07-30T10:30:00Z',
}

function LoginDestination() {
  const location = useLocation()
  const state = location.state as { from?: string } | null

  return (
    <>
      <h1>Login destination</h1>
      <output aria-label="Requested post">
        {state?.from ?? ''}
      </output>
    </>
  )
}

function renderOpenForm(
  authOverrides: Partial<AuthContextValue> = {},
  path = '/posts/example',
) {
  const authValue = {
    ...signedOutAuth,
    ...authOverrides,
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={authValue}>
        <Routes>
          <Route
            path="/posts/:slug"
            element={
              <PostCommentForm
                slug="example"
                allowComments
              />
            }
          />
          <Route
            path="/login"
            element={<LoginDestination />}
          />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('PostCommentForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    submitPostCommentMock.mockResolvedValue(publishedComment)
  })

  it('shows the closed state without requiring authentication context', () => {
    render(
      <PostCommentForm
        slug="example"
        allowComments={false}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Comments are closed for this post.',
    )
    expect(
      screen.queryByRole('textbox', { name: 'Comment' }),
    ).not.toBeInTheDocument()
  })

  it('waits while authentication initializes', () => {
    renderOpenForm({
      isInitializing: true,
    })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking whether you can comment…',
    )
    expect(
      screen.queryByRole('textbox', { name: 'Comment' }),
    ).not.toBeInTheDocument()
  })

  it('sends a signed-out user to login and preserves the complete URL', async () => {
    const user = userEvent.setup()
    renderOpenForm(
      {},
      '/posts/example?source=home#comments',
    )

    expect(
      screen.getByText('Log in to join the conversation.'),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('link', {
        name: 'Log in to comment',
      }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'Login destination',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('status', {
        name: 'Requested post',
      }),
    ).toHaveTextContent(
      '/posts/example?source=home#comments',
    )
  })

  it('renders an accessible authenticated comment form', () => {
    renderOpenForm(signedInAuth)

    expect(
      screen.getByRole('heading', {
        name: 'Leave a comment',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Comment' }),
    ).toHaveAttribute('maxlength', '2000')
    expect(
      screen.getByText('0/2000 characters'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Publish comment',
      }),
    ).toBeEnabled()
  })

  it('rejects whitespace-only content before calling the API', async () => {
    const user = userEvent.setup()
    renderOpenForm(signedInAuth)

    await user.type(
      screen.getByRole('textbox', { name: 'Comment' }),
      '   ',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Publish comment',
      }),
    )

    expect(submitPostCommentMock).not.toHaveBeenCalled()
    expect(
      screen.getByText('Comment content cannot be empty.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Comment' }),
    ).toHaveAttribute('aria-invalid', 'true')
  })

  it('publishes content, clears the form, and confirms publication', async () => {
    const user = userEvent.setup()
    renderOpenForm(signedInAuth)
    const textarea = screen.getByRole('textbox', {
      name: 'Comment',
    })

    await user.type(textarea, 'A thoughtful response.')
    await user.click(
      screen.getByRole('button', {
        name: 'Publish comment',
      }),
    )

    expect(submitPostCommentMock).toHaveBeenCalledWith(
      'example',
      {
        content: 'A thoughtful response.',
      },
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your comment is now published.',
    )
    expect(textarea).toHaveValue('')
    expect(
      screen.getByText('0/2000 characters'),
    ).toBeInTheDocument()
  })

  it('shows Django content validation beside the textarea', async () => {
    submitPostCommentMock.mockRejectedValue(
      new ApiError(
        'Request failed with status 400.',
        400,
        {
          content: ['Comment content is not allowed.'],
        },
      ),
    )
    const user = userEvent.setup()
    renderOpenForm(signedInAuth)

    await user.type(
      screen.getByRole('textbox', { name: 'Comment' }),
      'Rejected content',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Publish comment',
      }),
    )

    expect(
      await screen.findByText(
        'Comment content is not allowed.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Comment' }),
    ).toHaveAttribute(
      'aria-describedby',
      'comment-content-count comment-content-error',
    )
  })

  it('shows a general submission error without clearing content', async () => {
    submitPostCommentMock.mockRejectedValue(
      new Error('Comments are temporarily unavailable.'),
    )
    const user = userEvent.setup()
    renderOpenForm(signedInAuth)
    const textarea = screen.getByRole('textbox', {
      name: 'Comment',
    })

    await user.type(textarea, 'Keep this draft.')
    await user.click(
      screen.getByRole('button', {
        name: 'Publish comment',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Comments are temporarily unavailable.',
    )
    expect(textarea).toHaveValue('Keep this draft.')
  })

  it('disables the form while submission is pending', async () => {
    let resolveSubmission: (
      comment: SubmittedComment,
    ) => void = () => {}
    submitPostCommentMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSubmission = resolve
      }),
    )
    const user = userEvent.setup()
    renderOpenForm(signedInAuth)

    await user.type(
      screen.getByRole('textbox', { name: 'Comment' }),
      'Pending response',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Publish comment',
      }),
    )

    expect(
      screen.getByRole('button', { name: 'Publishing…' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('textbox', { name: 'Comment' }),
    ).toBeDisabled()

    await act(async () => {
      resolveSubmission(publishedComment)
    })
  })

  it('discards an unfinished draft when the active user signs out', async () => {
    const user = userEvent.setup()

    function FormWithAuth({
      authValue,
    }: {
      authValue: AuthContextValue
    }) {
      return (
        <MemoryRouter
          initialEntries={['/posts/example']}
        >
          <AuthContext.Provider value={authValue}>
            <PostCommentForm
              slug="example"
              allowComments
            />
          </AuthContext.Provider>
        </MemoryRouter>
      )
    }

    const { rerender } = render(
      <FormWithAuth authValue={signedInAuth} />,
    )

    await user.type(
      screen.getByRole('textbox', { name: 'Comment' }),
      'Private unfinished draft',
    )

    rerender(
      <FormWithAuth authValue={signedOutAuth} />,
    )
    expect(
      screen.getByRole('link', {
        name: 'Log in to comment',
      }),
    ).toBeInTheDocument()

    rerender(
      <FormWithAuth authValue={signedInAuth} />,
    )
    expect(
      screen.getByRole('textbox', { name: 'Comment' }),
    ).toHaveValue('')
  })
})
