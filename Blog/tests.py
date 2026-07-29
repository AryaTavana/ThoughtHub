from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .admin import PostAdminForm
from .models import Category, Post, PostBlock, Tag


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


class PublicPostListAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.public_post = Post.objects.create(
            title='Public post',
            content='Public content',
            status=Post.Status.PUBLISHED,
        )
        cls.due_scheduled_post = Post.objects.create(
            title='Due scheduled post',
            content='Scheduled content',
            status=Post.Status.SCHEDULED,
            published_at=timezone.now() - timedelta(minutes=1),
        )

        Post.objects.create(
            title='Draft post',
            status=Post.Status.DRAFT,
        )
        Post.objects.create(
            title='Review post',
            status=Post.Status.IN_REVIEW,
        )
        Post.objects.create(
            title='Rejected post',
            status=Post.Status.REJECTED,
            review_feedback='Needs improvement.',
        )
        Post.objects.create(
            title='Future post',
            status=Post.Status.SCHEDULED,
            published_at=timezone.now() + timedelta(days=1),
        )
        Post.objects.create(
            title='Archived post',
            status=Post.Status.ARCHIVED,
        )

        cls.url = reverse('blog:public-post-list')

    def test_anonymous_visitor_sees_only_public_posts(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_slugs = {
            post_data['slug']
            for post_data in response.data['results']
        }
        self.assertEqual(
            returned_slugs,
            {
                self.public_post.slug,
                self.due_scheduled_post.slug,
            },
        )
        self.assertEqual(response.data['count'], 2)
        self.assertIsNone(response.data['next'])
        self.assertIsNone(response.data['previous'])

    def test_post_method_is_not_allowed(self):
        response = self.client.post(
            self.url,
            {'title': 'Unauthorized post'},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class PublicPostDetailAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.public_post = Post.objects.create(
            title='آموزش جنگو',
            slug='آموزش-جنگو',
            content='Public introduction',
            status=Post.Status.PUBLISHED,
        )
        cls.block = PostBlock.objects.create(
            post=cls.public_post,
            block_type=PostBlock.BlockType.RICH_TEXT,
            position=0,
            content='<p>Public block content</p>',
        )
        cls.draft_post = Post.objects.create(
            title='Private draft',
            slug='private-draft',
            content='Private content',
            status=Post.Status.DRAFT,
        )

    def test_anonymous_visitor_can_read_published_unicode_slug(self):
        url = reverse(
            'blog:public-post-detail',
            kwargs={'slug': self.public_post.slug},
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['slug'], self.public_post.slug)
        self.assertEqual(
            response.data['content'],
            'Public introduction',
        )
        self.assertEqual(len(response.data['blocks']), 1)
        self.assertEqual(
            response.data['blocks'][0]['content'],
            '<p>Public block content</p>',
        )

    def test_draft_post_returns_not_found(self):
        url = reverse(
            'blog:public-post-detail',
            kwargs={'slug': self.draft_post.slug},
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_update_method_is_not_allowed(self):
        url = reverse(
            'blog:public-post-detail',
            kwargs={'slug': self.public_post.slug},
        )

        response = self.client.patch(
            url,
            {'title': 'Changed by visitor'},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class AuthorPostListCreateAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.author = user_model.objects.create_user(
            username='dashboard-author',
            password='StrongPassword123!',
        )
        cls.other_author = user_model.objects.create_user(
            username='other-author',
            password='StrongPassword123!',
        )

        cls.author_posts = {}
        for post_status in Post.Status.values:
            post_data = {
                'title': f'Author {post_status} post',
                'author': cls.author,
                'status': post_status,
            }

            if post_status == Post.Status.SCHEDULED:
                post_data['published_at'] = timezone.now() + timedelta(days=1)
            elif post_status == Post.Status.REJECTED:
                post_data['review_feedback'] = 'Please improve this post.'

            cls.author_posts[post_status] = Post.objects.create(**post_data)

        cls.other_post = Post.objects.create(
            title='Another author private draft',
            author=cls.other_author,
            status=Post.Status.DRAFT,
        )
        cls.category = Category.objects.create(
            name='Development',
            slug='development',
        )
        cls.tag = Tag.objects.create(
            name='Django',
            slug='django',
        )
        cls.url = reverse('blog:author-post-list')
        cls.csrf_url = reverse('account:csrf-token')

    def test_anonymous_visitor_cannot_open_author_dashboard(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_author_sees_their_posts_in_every_workflow_status(self):
        self.client.force_login(self.author)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], len(Post.Status.values))
        self.assertEqual(
            {post_data['status'] for post_data in response.data['results']},
            set(Post.Status.values),
        )

        rejected_post_data = next(
            post_data
            for post_data in response.data['results']
            if post_data['status'] == Post.Status.REJECTED
        )
        self.assertEqual(
            rejected_post_data['review_feedback'],
            'Please improve this post.',
        )

    def test_author_cannot_see_another_authors_posts(self):
        self.client.force_login(self.author)

        response = self.client.get(self.url)

        returned_slugs = {
            post_data['slug']
            for post_data in response.data['results']
        }
        self.assertNotIn(self.other_post.slug, returned_slugs)

    def test_most_recently_updated_post_appears_first(self):
        oldest_post = self.author_posts[Post.Status.DRAFT]
        Post.objects.filter(pk=oldest_post.pk).update(
            updated_at=timezone.now() + timedelta(minutes=1),
        )
        self.client.force_login(self.author)

        response = self.client.get(self.url)

        self.assertEqual(
            response.data['results'][0]['slug'],
            oldest_post.slug,
        )

    def test_dashboard_post_list_is_paginated(self):
        for number in range(5):
            Post.objects.create(
                title=f'Extra dashboard post {number}',
                author=self.author,
            )
        self.client.force_login(self.author)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 11)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNone(response.data['previous'])

    def test_anonymous_visitor_cannot_create_post(self):
        response = self.client.post(
            self.url,
            {'title': 'Anonymous draft'},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertFalse(
            Post.objects.filter(title='Anonymous draft').exists(),
        )

    def test_author_can_create_draft_with_category_and_tags(self):
        self.client.force_login(self.author)

        response = self.client.post(
            self.url,
            {
                'title': 'My new API post',
                'excerpt': 'A short introduction.',
                'content': 'The complete introduction.',
                'category': self.category.pk,
                'tags': [self.tag.pk],
                'post_type': Post.PostType.TUTORIAL,
                'allow_comments': False,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        created_post = Post.objects.get(pk=response.data['id'])
        self.assertEqual(created_post.author, self.author)
        self.assertEqual(created_post.status, Post.Status.DRAFT)
        self.assertEqual(created_post.slug, 'my-new-api-post')
        self.assertEqual(created_post.category, self.category)
        self.assertEqual(list(created_post.tags.all()), [self.tag])
        self.assertEqual(
            created_post.post_type,
            Post.PostType.TUTORIAL,
        )
        self.assertFalse(created_post.allow_comments)

    def test_author_cannot_set_protected_fields_when_creating_post(self):
        self.client.force_login(self.author)

        response = self.client.post(
            self.url,
            {
                'title': 'Protected fields attempt',
                'author': self.other_author.pk,
                'status': Post.Status.PUBLISHED,
                'review_feedback': 'Fake admin feedback',
                'published_at': timezone.now().isoformat(),
                'is_featured': True,
                'views': 999,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        created_post = Post.objects.get(pk=response.data['id'])
        self.assertEqual(created_post.author, self.author)
        self.assertEqual(created_post.status, Post.Status.DRAFT)
        self.assertEqual(created_post.review_feedback, '')
        self.assertIsNone(created_post.published_at)
        self.assertFalse(created_post.is_featured)
        self.assertEqual(created_post.views, 0)

    def test_invalid_category_and_tag_ids_are_rejected(self):
        self.client.force_login(self.author)

        response = self.client.post(
            self.url,
            {
                'title': 'Invalid relationships',
                'category': 999999,
                'tags': [999999],
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('category', response.data)
        self.assertIn('tags', response.data)
        self.assertFalse(
            Post.objects.filter(title='Invalid relationships').exists(),
        )

    def test_authenticated_post_creation_requires_csrf_token(self):
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.force_login(self.author)

        response = csrf_client.post(
            self.url,
            {'title': 'Missing CSRF token'},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertFalse(
            Post.objects.filter(title='Missing CSRF token').exists(),
        )

    def test_author_can_create_post_with_valid_csrf_token(self):
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.force_login(self.author)
        csrf_response = csrf_client.get(self.csrf_url)
        csrf_token = csrf_response.cookies['csrftoken'].value

        response = csrf_client.post(
            self.url,
            {'title': 'CSRF protected draft'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        created_post = Post.objects.get(pk=response.data['id'])
        self.assertEqual(created_post.author, self.author)
        self.assertEqual(created_post.status, Post.Status.DRAFT)


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
