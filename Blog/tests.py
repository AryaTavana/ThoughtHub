from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from .models import Post, PostBlock


class PostModelTests(TestCase):
    def test_slug_is_generated_and_made_unique(self):
        first_post = Post.objects.create(title='A useful Django post', content='Text')
        second_post = Post.objects.create(title='A useful Django post', content='Text')

        self.assertEqual(first_post.slug, 'a-useful-django-post')
        self.assertEqual(second_post.slug, 'a-useful-django-post-2')

    def test_publishing_sets_publication_time(self):
        post = Post.objects.create(
            title='Published post',
            content='Text',
            status=Post.Status.PUBLISHED,
        )

        self.assertIsNotNone(post.published_at)
        self.assertTrue(post.is_public)

    def test_scheduled_post_requires_a_publication_time(self):
        post = Post(
            title='Scheduled post',
            content='Text',
            status=Post.Status.SCHEDULED,
        )

        with self.assertRaises(ValidationError):
            post.full_clean()

    def test_published_queryset_excludes_drafts_and_future_posts(self):
        public_post = Post.objects.create(
            title='Public',
            content='Text',
            status=Post.Status.PUBLISHED,
        )
        Post.objects.create(title='Draft', content='Text')
        Post.objects.create(
            title='Future',
            content='Text',
            status=Post.Status.SCHEDULED,
            published_at=timezone.now() + timedelta(days=1),
        )

        self.assertEqual(list(Post.objects.published()), [public_post])

    def test_due_scheduled_post_is_public(self):
        post = Post.objects.create(
            title='Due scheduled post',
            content='Text',
            status=Post.Status.SCHEDULED,
            published_at=timezone.now() - timedelta(minutes=1),
        )

        self.assertTrue(post.is_public)
        self.assertEqual(list(Post.objects.published()), [post])

    def test_reading_time_has_a_one_minute_minimum(self):
        post = Post(title='Short post', content='Only a few words')

        self.assertEqual(post.reading_time, 1)

    def test_post_supports_unlimited_ordered_content_blocks(self):
        post = Post.objects.create(title='Block post')

        for position in range(12):
            PostBlock.objects.create(
                post=post,
                block_type=PostBlock.BlockType.RICH_TEXT,
                position=position,
                content=f'Paragraph {position}',
            )

        self.assertEqual(post.blocks.count(), 12)
        self.assertEqual(
            list(post.blocks.values_list('position', flat=True)),
            list(range(12)),
        )

    def test_rich_text_block_requires_content(self):
        post = Post.objects.create(title='Block validation')
        block = PostBlock(
            post=post,
            block_type=PostBlock.BlockType.RICH_TEXT,
        )

        with self.assertRaises(ValidationError):
            block.full_clean()

    def test_video_block_requires_a_url(self):
        post = Post.objects.create(title='Video validation')
        block = PostBlock(
            post=post,
            block_type=PostBlock.BlockType.VIDEO,
        )

        with self.assertRaises(ValidationError):
            block.full_clean()

    def test_reading_time_includes_rich_text_blocks(self):
        post = Post.objects.create(title='Long block post')
        PostBlock.objects.create(
            post=post,
            block_type=PostBlock.BlockType.RICH_TEXT,
            content=' '.join(['word'] * 201),
        )

        self.assertEqual(post.reading_time, 2)
