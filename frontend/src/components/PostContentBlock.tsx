import DOMPurify from 'dompurify'

import type {
    ImageWidth,
    PublicPostBlock,
} from '../api/posts'

interface PostContentBlockProps {
    block: PublicPostBlock
}

const imageWidthClasses: Record<ImageWidth, string> = {
    content: 'col-lg-8 mx-lg-auto',
    wide: 'col-lg-10 mx-lg-auto',
    full: 'w-100',
}

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
]

const allowedRichTextAttributes = [
    'href',
    'title',
]

function sanitizeRichText(content: string): string {
    return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: allowedRichTextTags,
        ALLOWED_ATTR: allowedRichTextAttributes,
        ALLOW_DATA_ATTR: false,
    })
}

function getSafeVideoUrl(value: string): string | null {
    try {
        const url = new URL(value)

        if (
            url.protocol !== 'http:' &&
            url.protocol !== 'https:'
        ) {
            return null
        }

        return url.toString()
    } catch {
        return null
    }
}

export function PostContentBlock({
    block,
}: PostContentBlockProps) {
    switch (block.block_type) {
        case 'rich_text': {
            const sanitizedContent =
                sanitizeRichText(block.content)

            return (
                <div
                    className="post-rich-text my-4"
                    dangerouslySetInnerHTML={{
                        __html: sanitizedContent,
                    }}
                />
            )
        }

        case 'image': {
            if (!block.image) {
                return null
            }

            return (
                <figure
                    className={`my-4 ${
                        imageWidthClasses[block.image_width]
                    }`}
                >
                    <img
                        className="img-fluid rounded w-100"
                        src={block.image}
                        alt={block.image_alt}
                        loading="lazy"
                    />

                    {block.caption && (
                        <figcaption className="small text-secondary text-center mt-2">
                            {block.caption}
                        </figcaption>
                    )}
                </figure>
            )
        }

        case 'video': {
            const safeVideoUrl =
                getSafeVideoUrl(block.video_url)

            if (!safeVideoUrl) {
                return null
            }

            return (
                <div className="card my-4">
                    <div className="card-body">
                        <h2 className="h5 card-title">
                            Video
                        </h2>

                        <p className="card-text text-secondary">
                            This post contains an external video.
                        </p>

                        <a
                            className="btn btn-outline-primary"
                            href={safeVideoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Watch video
                        </a>
                    </div>
                </div>
            )
        }

        case 'quote':
            return (
                <figure className="my-4 p-4 border-start border-4 border-primary bg-body-tertiary rounded">
                    <blockquote className="blockquote mb-2">
                        <p className="mb-0">
                            {block.content}
                        </p>
                    </blockquote>

                    {block.quote_attribution && (
                        <figcaption className="blockquote-footer mb-0 mt-2">
                            {block.quote_attribution}
                        </figcaption>
                    )}
                </figure>
            )

        case 'divider':
            return <hr className="my-5"/>

        default:
            return null
    }
}
