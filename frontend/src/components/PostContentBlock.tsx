import {Icon} from '@iconify/react'
import externalLinkIcon from '@iconify-icons/lucide/external-link'
import playIcon from '@iconify-icons/lucide/play'

import type {
    ImageWidth,
    PublicPostBlock,
} from '../api/posts'
import {sanitizeRichText} from '../richText'
import {getTextDirection} from '../textDirection'

interface PostContentBlockProps {
    block: PublicPostBlock
}

const imageWidthClasses: Record<ImageWidth, string> = {
    content: 'col-lg-8 mx-lg-auto',
    wide: 'col-lg-10 mx-lg-auto',
    full: 'w-100',
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
                    className="post-rich-text post-content-block"
                    dir={getTextDirection(block.content)}
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
                    className={`post-content-image ${
                        imageWidthClasses[block.image_width]
                    }`}
                >
                    <img
                        className="w-100"
                        src={block.image}
                        alt={block.image_alt}
                        loading="lazy"
                    />

                    {block.caption && (
                        <figcaption
                            dir={getTextDirection(block.caption)}
                        >
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
                <div className="post-video-card">
                    <div className="post-video-card__icon" aria-hidden="true"><Icon icon={playIcon}/></div>
                    <div>
                        <span className="content-label">External media</span>
                        <h2>Continue with this video</h2>
                        <p>This part of the post opens safely in a new tab.</p>

                        <a
                            className="button button--secondary button--small"
                            href={safeVideoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Watch video <Icon icon={externalLinkIcon} aria-hidden="true"/>
                        </a>
                    </div>
                </div>
            )
        }

        case 'quote':
            return (
                <figure className="post-quote-block">
                    <span aria-hidden="true">“</span>
                    <blockquote
                        dir={getTextDirection(block.content)}
                    >
                        <p>
                            {block.content}
                        </p>
                    </blockquote>

                    {block.quote_attribution && (
                        <figcaption
                            dir={getTextDirection(
                                block.quote_attribution,
                            )}
                        >
                            {block.quote_attribution}
                        </figcaption>
                    )}
                </figure>
            )

        case 'divider':
            return <hr className="my-5 post-content-divider"/>

        default:
            return null
    }
}
