from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from .admin import PostAdminForm
from .models import Post, PostBlock


class PostAdminFormTests(SimpleTestCase):
    def test_publishing_clears_old_rejection_feedback(self):
        form = PostAdminForm()
        form.cleaned_data = {
            'title': 'Approved post',
            'status': Post.Status.PUBLISHED,
            'post_type': Post.PostType.ARTICLE,
            'review_feedback': 'Old rejection feedback',
        }

        cleaned_data = form.clean()

        self.assertEqual(cleaned_data['review_feedback'], '')


class PostValidationTests(SimpleTestCase):
    def test_author_edit_returns_published_post_to_review(self):
        post = Post(
            title='Published post',
            status=Post.Status.PUBLISHED,
        )

        post.apply_author_edit()

        self.assertEqual(post.status, Post.Status.IN_REVIEW)

    def test_author_edit_returns_scheduled_post_to_review(self):
        post = Post(
            title='Scheduled post',
            status=Post.Status.SCHEDULED,
        )

        post.apply_author_edit()

        self.assertEqual(post.status, Post.Status.IN_REVIEW)

    def test_author_edit_turns_rejected_post_into_draft(self):
        post = Post(
            title='Rejected post',
            status=Post.Status.REJECTED,
        )

        post.apply_author_edit()

        self.assertEqual(post.status, Post.Status.DRAFT)

    def test_author_edit_does_not_change_other_workflow_statuses(self):
        unchanged_statuses = (
            Post.Status.DRAFT,
            Post.Status.IN_REVIEW,
            Post.Status.ARCHIVED,
        )

        for status in unchanged_statuses:
            with self.subTest(status=status):
                post = Post(title='Unchanged post', status=status)

                post.apply_author_edit()

                self.assertEqual(post.status, status)

    def test_draft_can_be_submitted_for_review(self):
        post = Post(
            title='Draft post',
            status=Post.Status.DRAFT,
        )

        post.submit_for_review()

        self.assertEqual(post.status, Post.Status.IN_REVIEW)

    def test_resubmission_clears_old_rejection_feedback(self):
        post = Post(
            title='Rejected post',
            status=Post.Status.REJECTED,
            review_feedback='Old feedback',
        )

        post.submit_for_review()

        self.assertEqual(post.status, Post.Status.IN_REVIEW)
        self.assertEqual(post.review_feedback, '')

    def test_published_post_cannot_be_submitted_for_review(self):
        post = Post(
            title='Published post',
            status=Post.Status.PUBLISHED,
        )

        with self.assertRaisesMessage(
            ValidationError,
            'Only draft or rejected posts can be submitted for review.',
        ):
            post.submit_for_review()

    def test_post_in_review_can_be_approved_for_immediate_publication(self):
        post = Post(
            title='Reviewed post',
            status=Post.Status.IN_REVIEW,
            review_feedback='Old feedback',
        )

        before_approval = timezone.now()
        post.approve()

        self.assertEqual(post.status, Post.Status.PUBLISHED)
        self.assertGreaterEqual(post.published_at, before_approval)
        self.assertEqual(post.review_feedback, '')

    def test_post_in_review_can_be_approved_for_scheduled_publication(self):
        publication_time = timezone.now() + timedelta(days=1)
        post = Post(
            title='Reviewed post',
            status=Post.Status.IN_REVIEW,
        )

        post.approve(publish_at=publication_time)

        self.assertEqual(post.status, Post.Status.SCHEDULED)
        self.assertEqual(post.published_at, publication_time)

    def test_post_outside_review_cannot_be_approved(self):
        post = Post(
            title='Draft post',
            status=Post.Status.DRAFT,
        )

        with self.assertRaisesMessage(
            ValidationError,
            'Only posts in review can be approved.',
        ):
            post.approve()

    def test_post_in_review_can_be_rejected_with_trimmed_feedback(self):
        post = Post(
            title='Reviewed post',
            status=Post.Status.IN_REVIEW,
        )

        post.reject(feedback='  Improve the introduction.  ')

        self.assertEqual(post.status, Post.Status.REJECTED)
        self.assertEqual(
            post.review_feedback,
            'Improve the introduction.',
        )

    def test_rejection_requires_feedback(self):
        post = Post(
            title='Reviewed post',
            status=Post.Status.IN_REVIEW,
        )

        with self.assertRaisesMessage(
            ValidationError,
            'Add feedback when rejecting a post.',
        ):
            post.reject(feedback='   ')

    def test_post_outside_review_cannot_be_rejected(self):
        post = Post(
            title='Draft post',
            status=Post.Status.DRAFT,
        )

        with self.assertRaisesMessage(
            ValidationError,
            'Only posts in review can be rejected.',
        ):
            post.reject(feedback='Needs work.')

    def test_rejected_post_requires_review_feedback(self):
        post = Post(
            title='Rejected post',
            status=Post.Status.REJECTED,
            review_feedback='   ',
        )

        with self.assertRaisesMessage(
            ValidationError,
            'Add feedback when rejecting a post.',
        ):
            post.clean()

    def test_rejected_post_accepts_review_feedback(self):
        post = Post(
            title='Rejected post',
            status=Post.Status.REJECTED,
            review_feedback='Please improve the introduction.',
        )

        post.clean()


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
