import {
  render,
  screen,
} from '@testing-library/react'
import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  ImageWidth,
  PublicPostBlock,
} from '../api/posts'
import { PostContentBlock } from './PostContentBlock'

const baseBlock: PublicPostBlock = {
  id: 1,
  block_type: 'rich_text',
  position: 0,
  content: '',
  image: null,
  image_alt: '',
  caption: '',
  image_width: 'content',
  video_url: '',
  quote_attribution: '',
}

function createBlock(
  overrides: Partial<PublicPostBlock>,
): PublicPostBlock {
  return {
    ...baseBlock,
    ...overrides,
  }
}

describe('PostContentBlock', () => {
  it('keeps allowed rich text and removes dangerous markup', () => {
    const block = createBlock({
      block_type: 'rich_text',
      content: `
        <h2>Safe heading</h2>
        <p onclick="alert('clicked')">
          Hello <strong>world</strong>.
          <a href="javascript:alert('link')">Unsafe link</a>
          <a href="https://example.com" title="Documentation">
            Safe link
          </a>
        </p>
        <img src="invalid" onerror="alert('image')" />
        <script>alert('script')</script>
      `,
    })
    const { container } = render(
      <PostContentBlock block={block} />,
    )

    expect(
      screen.getByRole('heading', { name: 'Safe heading' }),
    ).toBeInTheDocument()
    expect(screen.getByText('world')).toHaveProperty(
      'tagName',
      'STRONG',
    )
    expect(
      screen.getByRole('link', { name: 'Safe link' }),
    ).toHaveAttribute('href', 'https://example.com')
    expect(screen.getByText('Unsafe link')).not.toHaveAttribute(
      'href',
    )
    expect(container.querySelector('[onclick]')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
    expect(container).not.toHaveTextContent("alert('script')")
  })

  const imageWidthCases: Array<[ImageWidth, string]> = [
    ['content', 'col-lg-8'],
    ['wide', 'col-lg-10'],
    ['full', 'w-100'],
  ]

  it.each(imageWidthCases)(
    'applies the %s image-width layout',
    (imageWidth, expectedClass) => {
      const block = createBlock({
        block_type: 'image',
        image: '/media/posts/blocks/architecture.jpg',
        image_alt: 'Application architecture',
        caption: 'How Django and React communicate',
        image_width: imageWidth,
      })
      const { container } = render(
        <PostContentBlock block={block} />,
      )

      expect(
        screen.getByRole('img', {
          name: 'Application architecture',
        }),
      ).toHaveAttribute(
        'src',
        '/media/posts/blocks/architecture.jpg',
      )
      expect(
        screen.getByText('How Django and React communicate'),
      ).toBeInTheDocument()
      expect(container.querySelector('figure')).toHaveClass(
        expectedClass,
      )
    },
  )

  it('renders nothing for an image block without an image', () => {
    const block = createBlock({
      block_type: 'image',
      image: null,
      image_alt: 'Missing image',
    })
    const { container } = render(
      <PostContentBlock block={block} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders a safe external video link', () => {
    const block = createBlock({
      block_type: 'video',
      video_url: 'https://video.example.com/watch?id=5',
    })

    render(<PostContentBlock block={block} />)

    expect(
      screen.getByRole('link', { name: 'Watch video' }),
    ).toHaveAttribute(
      'href',
      'https://video.example.com/watch?id=5',
    )
    expect(
      screen.getByRole('link', { name: 'Watch video' }),
    ).toHaveAttribute('target', '_blank')
    expect(
      screen.getByRole('link', { name: 'Watch video' }),
    ).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'not a valid URL',
  ])('rejects the unsafe video URL %s', (videoUrl) => {
    const block = createBlock({
      block_type: 'video',
      video_url: videoUrl,
    })
    const { container } = render(
      <PostContentBlock block={block} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders a semantic quote with optional attribution', () => {
    const block = createBlock({
      block_type: 'quote',
      content: 'Clear code communicates intent.',
      quote_attribution: 'ThoughtHub editor',
    })
    const { container } = render(
      <PostContentBlock block={block} />,
    )

    expect(container.querySelector('blockquote')).toHaveTextContent(
      'Clear code communicates intent.',
    )
    expect(
      screen.getByText('ThoughtHub editor'),
    ).toBeInTheDocument()
  })

  it('renders a divider as a semantic separator', () => {
    const block = createBlock({
      block_type: 'divider',
    })

    render(<PostContentBlock block={block} />)

    expect(screen.getByRole('separator')).toHaveClass('my-5')
  })
})
