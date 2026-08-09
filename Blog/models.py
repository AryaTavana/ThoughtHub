from math import ceil

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.html import strip_tags
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ('name',)
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name


class PublishedPostQuerySet(models.QuerySet):
    def published(self):
        return self.filter(
            status=Post.Status.PUBLISHED,
            published_at__lte=timezone.now(),
        )


class Post(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'
        REMOVED = 'removed', 'Removed'
        ARCHIVED = 'archived', 'Archived'

    class PostType(models.TextChoices):
        ARTICLE = 'article', 'Article'
        NEWS = 'news', 'News'
        TUTORIAL = 'tutorial', 'Tutorial'
        OPINION = 'opinion', 'Opinion'

    title = models.CharField(max_length=200)
    slug = models.SlugField(
        max_length=220,
        unique=True,
        blank=True,
        allow_unicode=True,
        help_text='Generated from the title when left empty.',
    )
    excerpt = models.TextField(
        max_length=500,
        blank=True,
        help_text='A short summary used in post lists and social previews.',
    )
    content = models.TextField(
        blank=True,
        help_text=(
            'Optional introduction or legacy body. Use the ordered content '
            'blocks below for long, image-rich posts.'
        ),
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='posts',
        null=True,
        blank=True,
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        related_name='posts',
        null=True,
        blank=True,
    )
    tags = models.ManyToManyField(Tag, related_name='posts', blank=True)

    featured_image = models.ImageField(
        upload_to='posts/%Y/%m/',
        blank=True,
    )
    featured_image_alt = models.CharField(
        max_length=200,
        blank=True,
        help_text='Describe the image for accessibility and SEO.',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    review_feedback = models.TextField(
        blank=True,
        help_text='The moderator’s reason for removing this post.',
    )
    post_type = models.CharField(
        max_length=20,
        choices=PostType.choices,
        default=PostType.ARTICLE,
    )

    is_featured = models.BooleanField(default=False)
    allow_comments = models.BooleanField(default=True)

    meta_title = models.CharField(
        max_length=60,
        blank=True,
        help_text='Optional search-engine title. Keep it under 60 characters.',
    )
    meta_description = models.CharField(
        max_length=160,
        blank=True,
        help_text='Optional search-engine summary. Keep it under 160 characters.',
    )

    published_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text='The most recent time this post was published.',
    )
    date_posted = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    views = models.PositiveBigIntegerField(default=0, editable=False)
    likes = models.PositiveIntegerField(default=0, editable=False)
    comments = models.PositiveIntegerField(default=0, editable=False)

    objects = PublishedPostQuerySet.as_manager()

    def __str__(self):
        return self.title

    def apply_author_edit(self):
        """Return removed content to a private draft when revised."""
        if self.status == self.Status.REMOVED:
            self.status = self.Status.DRAFT

    def publish(self):
        """Publish an author-owned draft immediately."""
        if self.status not in {
            self.Status.DRAFT,
            self.Status.REMOVED,
        }:
            raise ValidationError({
                'status': (
                    'Only draft or removed posts can be published.'
                ),
            })

        self.status = self.Status.PUBLISHED
        self.published_at = timezone.now()
        self.review_feedback = ''

    def remove(self, *, feedback):
        """Hide a public post and retain an actionable reason."""
        if self.status != self.Status.PUBLISHED:
            raise ValidationError({
                'status': 'Only published posts can be removed.',
            })

        feedback = feedback.strip()
        if not feedback:
            raise ValidationError({
                'review_feedback': 'Explain why this post was removed.',
            })

        self.status = self.Status.REMOVED
        self.review_feedback = feedback

    def clean(self):
        super().clean()

        if self.featured_image and not self.featured_image_alt:
            raise ValidationError({
                'featured_image_alt': (
                    'Add alternative text when a featured image is used.'
                ),
            })

        if self.status == self.Status.REMOVED and not self.review_feedback.strip():
            raise ValidationError({
                'review_feedback': 'Explain why this post was removed.',
            })

    def save(self, *args, **kwargs):
        changed_fields = set()

        if not self.slug:
            self.slug = self._generate_unique_slug()
            changed_fields.add('slug')

        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
            changed_fields.add('published_at')

        if kwargs.get('update_fields') is not None:
            kwargs['update_fields'] = set(kwargs['update_fields']) | changed_fields

        super().save(*args, **kwargs)

    def _generate_unique_slug(self):
        base_slug = slugify(self.title, allow_unicode=True) or 'post'
        base_slug = base_slug[:210]
        slug = base_slug
        suffix = 2

        matching_posts = type(self).objects.exclude(pk=self.pk)
        while matching_posts.filter(slug=slug).exists():
            slug = f'{base_slug}-{suffix}'
            suffix += 1

        return slug

    @property
    def is_public(self):
        return (
                self.status == self.Status.PUBLISHED
                and self.published_at is not None
                and self.published_at <= timezone.now()
        )

    @property
    def reading_time(self):
        words_per_minute = 200
        text_parts = [self.content]

        if self.pk:
            text_block_types = (
                PostBlock.BlockType.RICH_TEXT,
                PostBlock.BlockType.QUOTE,
            )
            text_parts.extend(
                block.content
                for block in self.blocks.all()
                if block.block_type in text_block_types
            )

        word_count = len(strip_tags(' '.join(text_parts)).split())
        return max(1, ceil(word_count / words_per_minute))

    class Meta:
        ordering = ('-published_at', '-date_posted')
        indexes = [
            models.Index(
                fields=('status', 'published_at'),
                name='blog_post_status_publish_idx',
            ),
            models.Index(
                fields=('category', 'status'),
                name='blog_post_category_status_idx',
            ),
        ]
        verbose_name = 'Post'
        verbose_name_plural = 'Posts'


class PostBlock(models.Model):
    class BlockType(models.TextChoices):
        RICH_TEXT = 'rich_text', 'Rich text'
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Video'
        QUOTE = 'quote', 'Quote'
        DIVIDER = 'divider', 'Divider'

    class ImageWidth(models.TextChoices):
        CONTENT = 'content', 'Content width'
        WIDE = 'wide', 'Wide'
        FULL = 'full', 'Full width'

    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='blocks',
    )
    block_type = models.CharField(
        max_length=20,
        choices=BlockType.choices,
        default=BlockType.RICH_TEXT,
    )
    position = models.PositiveIntegerField(
        default=0,
        help_text='Lower numbers appear first.',
    )

    content = models.TextField(
        blank=True,
        help_text='Used by rich-text and quote blocks.',
    )
    image = models.ImageField(
        upload_to='posts/blocks/%Y/%m/',
        blank=True,
    )
    image_alt = models.CharField(
        max_length=200,
        blank=True,
        help_text='Required for image blocks.',
    )
    caption = models.CharField(max_length=300, blank=True)
    image_width = models.CharField(
        max_length=10,
        choices=ImageWidth.choices,
        default=ImageWidth.CONTENT,
    )
    video_url = models.URLField(
        blank=True,
        help_text='YouTube, Vimeo, or another embeddable video URL.',
    )
    quote_attribution = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.post.title} — {self.get_block_type_display()} #{self.position}'

    def clean(self):
        super().clean()

        if self.block_type in {
            self.BlockType.RICH_TEXT,
            self.BlockType.QUOTE,
        } and not self.content.strip():
            raise ValidationError({
                'content': 'Add content for this block type.',
            })

        if self.block_type == self.BlockType.IMAGE:
            errors = {}
            if not self.image:
                errors['image'] = 'Choose an image for this block.'
            if not self.image_alt:
                errors['image_alt'] = 'Describe the image for accessibility.'
            if errors:
                raise ValidationError(errors)

        if self.block_type == self.BlockType.VIDEO and not self.video_url:
            raise ValidationError({
                'video_url': 'Add a URL for this video block.',
            })

    class Meta:
        ordering = ('position', 'pk')
        indexes = [
            models.Index(
                fields=('post', 'position'),
                name='blog_block_post_position_idx',
            ),
        ]


class Comment(models.Model):
    class Status(models.TextChoices):
        APPROVED = 'approved', 'Approved'
        REMOVED = 'removed', 'Removed'

    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='comment_entries',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='comment_entries',
        null=True,
    )
    content = models.TextField(max_length=2000)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.APPROVED,
        db_index=True,
    )
    moderation_feedback = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        author_name = self.author.username if self.author else 'Deleted user'
        return f'{author_name} on {self.post.title}'

    def clean(self):
        super().clean()

        self.content = self.content.strip()
        if not self.content:
            raise ValidationError({
                'content': 'Comment content cannot be empty.',
            })

        if (
            self.status == self.Status.REMOVED
            and not self.moderation_feedback.strip()
        ):
            raise ValidationError({
                'moderation_feedback': (
                    'Explain why this comment was removed.'
                ),
            })

    def approve(self):
        self.status = self.Status.APPROVED
        self.moderation_feedback = ''

    def remove(self, *, feedback):
        feedback = feedback.strip()
        if not feedback:
            raise ValidationError({
                'moderation_feedback': (
                    'Explain why this comment was removed.'
                ),
            })

        self.status = self.Status.REMOVED
        self.moderation_feedback = feedback

    class Meta:
        ordering = ('-created_at',)
        indexes = [
            models.Index(
                fields=('post', 'status', 'created_at'),
                name='blog_comment_post_status_idx',
            ),
        ]
