from datetime import timedelta
import tempfile
from unittest.mock import Mock

from django.contrib import admin as django_admin
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .admin import CommentAdmin, PostAdminForm
from .models import Category, Comment, Post, PostBlock, Tag


class PostAdminFormTests(SimpleTestCase):
    def test_publishing_clears_old_removal_feedback(self):
        form = PostAdminForm()
        form.cleaned_data = {
            'title': 'Approved post',
            'status': Post.Status.PUBLISHED,
            'post_type': Post.PostType.ARTICLE,
            'review_feedback': 'Old removal feedback',
        }

        cleaned_data = form.clean()

        self.assertEqual(cleaned_data['review_feedback'], '')


class PostValidationTests(SimpleTestCase):
    def test_author_edit_keeps_published_post_public(self):
        post = Post(
            title='Published post',
            status=Post.Status.PUBLISHED,
        )

        post.apply_author_edit()

        self.assertEqual(post.status, Post.Status.PUBLISHED)

    def test_author_edit_turns_removed_post_into_draft(self):
        post = Post(
            title='Removed post',
            status=Post.Status.REMOVED,
            review_feedback='Please remove private information.',
        )

        post.apply_author_edit()

        self.assertEqual(post.status, Post.Status.DRAFT)

    def test_author_edit_does_not_change_other_workflow_statuses(self):
        unchanged_statuses = (
            Post.Status.DRAFT,
            Post.Status.ARCHIVED,
        )

        for status in unchanged_statuses:
            with self.subTest(status=status):
                post = Post(title='Unchanged post', status=status)

                post.apply_author_edit()

                self.assertEqual(post.status, status)

    def test_draft_can_be_published_immediately(self):
        post = Post(
            title='Draft post',
            status=Post.Status.DRAFT,
        )

        before_publish = timezone.now()
        post.publish()

        self.assertEqual(post.status, Post.Status.PUBLISHED)
        self.assertGreaterEqual(post.published_at, before_publish)

    def test_republishing_removed_post_clears_feedback(self):
        post = Post(
            title='Removed post',
            status=Post.Status.REMOVED,
            review_feedback='Remove personal information.',
        )

        post.publish()

        self.assertEqual(post.status, Post.Status.PUBLISHED)
        self.assertEqual(post.review_feedback, '')

    def test_published_post_cannot_be_published_again(self):
        post = Post(
            title='Published post',
            status=Post.Status.PUBLISHED,
        )

        with self.assertRaisesMessage(
                ValidationError,
                'Only draft or removed posts can be published.',
        ):
            post.publish()

    def test_published_post_can_be_removed_with_trimmed_feedback(self):
        post = Post(
            title='Public post',
            status=Post.Status.PUBLISHED,
        )

        post.remove(feedback='  Remove private information.  ')

        self.assertEqual(post.status, Post.Status.REMOVED)
        self.assertEqual(
            post.review_feedback,
            'Remove private information.',
        )

    def test_removal_requires_feedback(self):
        post = Post(
            title='Public post',
            status=Post.Status.PUBLISHED,
        )

        with self.assertRaisesMessage(
                ValidationError,
                'Explain why this post was removed.',
        ):
            post.remove(feedback='   ')

    def test_private_post_cannot_be_removed(self):
        post = Post(
            title='Draft post',
            status=Post.Status.DRAFT,
        )

        with self.assertRaisesMessage(
                ValidationError,
                'Only published posts can be removed.',
        ):
            post.remove(feedback='Needs work.')

    def test_removed_post_requires_moderation_feedback(self):
        post = Post(
            title='Removed post',
            status=Post.Status.REMOVED,
            review_feedback='   ',
        )

        with self.assertRaisesMessage(
                ValidationError,
                'Explain why this post was removed.',
        ):
            post.clean()

    def test_removed_post_accepts_moderation_feedback(self):
        post = Post(
            title='Removed post',
            status=Post.Status.REMOVED,
            review_feedback='This included private information.',
        )

        post.clean()


class CommentValidationTests(SimpleTestCase):
    def test_new_comment_is_approved_by_default(self):
        comment = Comment(content='A new comment')

        self.assertEqual(comment.status, Comment.Status.APPROVED)

    def test_comment_content_is_trimmed_during_validation(self):
        comment = Comment(content='  Helpful comment.  ')

        comment.clean()

        self.assertEqual(comment.content, 'Helpful comment.')

    def test_whitespace_only_comment_is_rejected(self):
        comment = Comment(content='   ')

        with self.assertRaisesMessage(
            ValidationError,
            'Comment content cannot be empty.',
        ):
            comment.clean()

    def test_approving_comment_clears_moderation_feedback(self):
        comment = Comment(
            content='Corrected comment',
            status=Comment.Status.REMOVED,
            moderation_feedback='Old feedback',
        )

        comment.approve()

        self.assertEqual(comment.status, Comment.Status.APPROVED)
        self.assertEqual(comment.moderation_feedback, '')

    def test_removing_comment_requires_and_trims_feedback(self):
        comment = Comment(
            content='Comment requiring moderation',
            status=Comment.Status.APPROVED,
        )

        comment.remove(
            feedback='  Please keep the discussion relevant.  ',
        )

        self.assertEqual(comment.status, Comment.Status.REMOVED)
        self.assertEqual(
            comment.moderation_feedback,
            'Please keep the discussion relevant.',
        )

        with self.assertRaisesMessage(
            ValidationError,
            'Explain why this comment was removed.',
        ):
            Comment(content='Another comment').remove(feedback='   ')

    def test_deleted_comment_author_has_readable_string(self):
        comment = Comment(
            post=Post(title='Readable post'),
            author=None,
            content='Preserved comment',
        )

        self.assertEqual(
            str(comment),
            'Deleted user on Readable post',
        )


class CommentModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.author = user_model.objects.create_user(
            username='comment-author',
            password='StrongPassword123!',
        )
        cls.post = Post.objects.create(
            title='Post with comments',
            status=Post.Status.PUBLISHED,
        )
        cls.first_comment = Comment.objects.create(
            post=cls.post,
            author=cls.author,
            content='First comment',
        )
        cls.second_comment = Comment.objects.create(
            post=cls.post,
            author=cls.author,
            content='Second comment',
            status=Comment.Status.APPROVED,
        )

    def test_created_comment_is_approved_in_database(self):
        self.first_comment.refresh_from_db()

        self.assertEqual(
            self.first_comment.status,
            Comment.Status.APPROVED,
        )

    def test_post_reverse_relation_returns_newest_comment_first(self):
        self.assertEqual(
            list(self.post.comment_entries.all()),
            [self.second_comment, self.first_comment],
        )

    def test_deleting_post_cascades_to_comments(self):
        post = Post.objects.create(title='Temporary commented post')
        comment = Comment.objects.create(
            post=post,
            author=self.author,
            content='This will be deleted with the post.',
        )

        post.delete()

        self.assertFalse(
            Comment.objects.filter(pk=comment.pk).exists(),
        )

    def test_deleting_user_preserves_comment_with_null_author(self):
        user = get_user_model().objects.create_user(
            username='temporary-commenter',
            password='StrongPassword123!',
        )
        comment = Comment.objects.create(
            post=self.post,
            author=user,
            content='This comment should remain.',
        )

        user.delete()

        comment.refresh_from_db()
        self.assertIsNone(comment.author)
        self.assertEqual(
            str(comment),
            'Deleted user on Post with comments',
        )


class CommentAdminTests(TestCase):
    def setUp(self):
        self.author = get_user_model().objects.create_user(
            username='admin-comment-author',
            password='StrongPassword123!',
        )
        self.post = Post.objects.create(
            title='Admin moderated post',
            status=Post.Status.PUBLISHED,
        )
        self.comment_admin = CommentAdmin(Comment, django_admin.site)
        self.comment_admin.message_user = Mock()

    def test_comment_model_is_registered_in_admin(self):
        self.assertIsInstance(
            django_admin.site._registry[Comment],
            CommentAdmin,
        )

    def test_bulk_restore_clears_feedback_and_updates_post_count(self):
        comment = Comment.objects.create(
            post=self.post,
            author=self.author,
            content='Comment to restore',
            status=Comment.Status.REMOVED,
            moderation_feedback='Old moderation feedback',
        )

        self.comment_admin.restore_selected_comments(
            request=Mock(),
            queryset=Comment.objects.filter(pk=comment.pk),
        )

        comment.refresh_from_db()
        self.post.refresh_from_db()
        self.assertEqual(comment.status, Comment.Status.APPROVED)
        self.assertEqual(comment.moderation_feedback, '')
        self.assertEqual(self.post.comments, 1)

    def test_individual_removal_updates_post_count(self):
        comment = Comment.objects.create(
            post=self.post,
            author=self.author,
            content='Comment to remove',
            status=Comment.Status.APPROVED,
        )
        Post.objects.filter(pk=self.post.pk).update(comments=1)

        comment.status = Comment.Status.REMOVED
        comment.moderation_feedback = 'This comment was off topic.'

        self.comment_admin.save_model(
            request=Mock(),
            obj=comment,
            form=None,
            change=True,
        )

        comment.refresh_from_db()
        self.post.refresh_from_db()
        self.assertEqual(comment.status, Comment.Status.REMOVED)
        self.assertEqual(self.post.comments, 0)

    def test_individual_admin_save_updates_post_count(self):
        comment = Comment.objects.create(
            post=self.post,
            author=self.author,
            content='Individually approved comment',
        )
        comment.status = Comment.Status.APPROVED

        self.comment_admin.save_model(
            request=Mock(),
            obj=comment,
            form=None,
            change=True,
        )

        self.post.refresh_from_db()
        self.assertEqual(self.post.comments, 1)

    def test_individual_admin_delete_updates_post_count(self):
        comment = Comment.objects.create(
            post=self.post,
            author=self.author,
            content='Approved comment to delete',
            status=Comment.Status.APPROVED,
        )
        Post.objects.filter(pk=self.post.pk).update(comments=1)

        self.comment_admin.delete_model(
            request=Mock(),
            obj=comment,
        )

        self.post.refresh_from_db()
        self.assertEqual(self.post.comments, 0)

    def test_bulk_admin_delete_updates_post_count(self):
        first_comment = Comment.objects.create(
            post=self.post,
            author=self.author,
            content='First approved comment',
            status=Comment.Status.APPROVED,
        )
        second_comment = Comment.objects.create(
            post=self.post,
            author=self.author,
            content='Second approved comment',
            status=Comment.Status.APPROVED,
        )
        Post.objects.filter(pk=self.post.pk).update(comments=2)

        self.comment_admin.delete_queryset(
            request=Mock(),
            queryset=Comment.objects.filter(
                pk__in=(first_comment.pk, second_comment.pk),
            ),
        )

        self.post.refresh_from_db()
        self.assertEqual(self.post.comments, 0)


class TaxonomyListAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.backend_category = Category.objects.create(
            name='Backend',
            slug='backend',
        )
        cls.design_category = Category.objects.create(
            name='Design',
            slug='design',
        )
        cls.django_tag = Tag.objects.create(
            name='Django',
            slug='django',
        )
        cls.python_tag = Tag.objects.create(
            name='Python',
            slug='python',
        )
        cls.category_url = reverse('blog:category-list')
        cls.tag_url = reverse('blog:tag-list')

    def test_anonymous_visitor_can_list_categories(self):
        response = self.client.get(self.category_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.backend_category.pk,
                    'name': 'Backend',
                    'slug': 'backend',
                },
                {
                    'id': self.design_category.pk,
                    'name': 'Design',
                    'slug': 'design',
                },
            ],
        )

    def test_anonymous_visitor_can_list_tags(self):
        response = self.client.get(self.tag_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.django_tag.pk,
                    'name': 'Django',
                    'slug': 'django',
                },
                {
                    'id': self.python_tag.pk,
                    'name': 'Python',
                    'slug': 'python',
                },
            ],
        )

    def test_taxonomy_endpoints_are_read_only(self):
        endpoint_payloads = (
            (
                self.category_url,
                {'name': 'Unauthorized', 'slug': 'unauthorized'},
            ),
            (
                self.tag_url,
                {'name': 'Unauthorized', 'slug': 'unauthorized'},
            ),
        )

        for url, payload in endpoint_payloads:
            with self.subTest(url=url):
                response = self.client.post(
                    url,
                    payload,
                    format='json',
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_405_METHOD_NOT_ALLOWED,
                )


class PublicPostListAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.public_post = Post.objects.create(
            title='Public post',
            content='Public content',
            status=Post.Status.PUBLISHED,
        )
        cls.second_public_post = Post.objects.create(
            title='Second public post',
            content='More public content',
            status=Post.Status.PUBLISHED,
            published_at=timezone.now() - timedelta(minutes=1),
        )

        Post.objects.create(
            title='Draft post',
            status=Post.Status.DRAFT,
        )
        Post.objects.create(
            title='Removed post',
            status=Post.Status.REMOVED,
            review_feedback='This contained private information.',
        )
        Post.objects.create(
            title='Future post',
            status=Post.Status.PUBLISHED,
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
                self.second_public_post.slug,
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
            response.data['blocks'][0]['id'],
            self.block.pk,
        )
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


class PublicPostCommentListCreateAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.commenter = user_model.objects.create_user(
            username='public-commenter',
            password='StrongPassword123!',
        )
        cls.other_user = user_model.objects.create_user(
            username='other-commenter',
            password='StrongPassword123!',
        )
        deleted_user = user_model.objects.create_user(
            username='deleted-commenter',
            password='StrongPassword123!',
        )

        cls.public_post = Post.objects.create(
            title='Public commented post',
            status=Post.Status.PUBLISHED,
            allow_comments=True,
        )
        cls.closed_post = Post.objects.create(
            title='Closed comments post',
            status=Post.Status.PUBLISHED,
            allow_comments=False,
        )
        cls.draft_post = Post.objects.create(
            title='Private commented draft',
            status=Post.Status.DRAFT,
        )
        cls.removed_post = Post.objects.create(
            title='Removed commented post',
            status=Post.Status.REMOVED,
            review_feedback='Removed by a moderator.',
        )
        cls.second_public_post = Post.objects.create(
            title='Second public commented post',
            status=Post.Status.PUBLISHED,
        )

        cls.approved_comment = Comment.objects.create(
            post=cls.public_post,
            author=cls.commenter,
            content='Visible approved comment',
            status=Comment.Status.APPROVED,
        )
        cls.removed_comment = Comment.objects.create(
            post=cls.public_post,
            author=cls.commenter,
            content='Hidden removed comment',
            status=Comment.Status.REMOVED,
            moderation_feedback='Not suitable.',
        )
        cls.deleted_author_comment = Comment.objects.create(
            post=cls.public_post,
            author=deleted_user,
            content='Visible preserved comment',
            status=Comment.Status.APPROVED,
        )
        deleted_user.delete()

        cls.closed_post_comment = Comment.objects.create(
            post=cls.closed_post,
            author=cls.commenter,
            content='Visible comment on closed post',
            status=Comment.Status.APPROVED,
        )
        cls.second_public_comment = Comment.objects.create(
            post=cls.second_public_post,
            author=cls.commenter,
            content='Visible comment on another post',
            status=Comment.Status.APPROVED,
        )
        Post.objects.filter(pk=cls.public_post.pk).update(comments=2)

    @staticmethod
    def comments_url(post):
        return reverse(
            'blog:public-post-comment-list',
            kwargs={'slug': post.slug},
        )

    def test_anonymous_visitor_sees_only_approved_comments(self):
        response = self.client.get(self.comments_url(self.public_post))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(
            [
                comment_data['id']
                for comment_data in response.data['results']
            ],
            [
                self.deleted_author_comment.pk,
                self.approved_comment.pk,
            ],
        )
        returned_ids = {
            comment_data['id']
            for comment_data in response.data['results']
        }
        self.assertNotIn(self.removed_comment.pk, returned_ids)

        for comment_data in response.data['results']:
            self.assertNotIn('status', comment_data)
            self.assertNotIn('moderation_feedback', comment_data)

    def test_deleted_comment_author_has_public_fallback_name(self):
        response = self.client.get(self.comments_url(self.public_post))

        deleted_author_data = next(
            comment_data
            for comment_data in response.data['results']
            if comment_data['id'] == self.deleted_author_comment.pk
        )
        self.assertEqual(
            deleted_author_data['author_username'],
            'Deleted user',
        )

    def test_closed_comments_remain_publicly_visible(self):
        response = self.client.get(self.comments_url(self.closed_post))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(
            response.data['results'][0]['id'],
            self.closed_post_comment.pk,
        )

    def test_another_published_post_comments_are_public(self):
        response = self.client.get(
            self.comments_url(self.second_public_post),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(
            response.data['results'][0]['id'],
            self.second_public_comment.pk,
        )

    def test_non_public_post_comments_return_not_found(self):
        for post in (self.draft_post, self.removed_post):
            with self.subTest(post_status=post.status):
                response = self.client.get(self.comments_url(post))

                self.assertEqual(
                    response.status_code,
                    status.HTTP_404_NOT_FOUND,
                )

    def test_anonymous_visitor_cannot_submit_comment(self):
        response = self.client.post(
            self.comments_url(self.public_post),
            {'content': 'Anonymous comment'},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertFalse(
            Comment.objects.filter(content='Anonymous comment').exists(),
        )

    def test_authenticated_user_can_publish_trimmed_comment_immediately(self):
        self.client.force_login(self.commenter)

        response = self.client.post(
            self.comments_url(self.public_post),
            {'content': '  A thoughtful response.  '},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        comment = Comment.objects.get(pk=response.data['id'])
        self.assertEqual(comment.post, self.public_post)
        self.assertEqual(comment.author, self.commenter)
        self.assertEqual(comment.content, 'A thoughtful response.')
        self.assertEqual(comment.status, Comment.Status.APPROVED)
        self.assertEqual(
            response.data['author_username'],
            self.commenter.username,
        )
        self.assertEqual(
            response.data['status'],
            Comment.Status.APPROVED,
        )
        self.public_post.refresh_from_db()
        self.assertEqual(self.public_post.comments, 3)

    def test_user_cannot_forge_comment_ownership_or_moderation(self):
        self.client.force_login(self.commenter)

        response = self.client.post(
            self.comments_url(self.public_post),
            {
                'content': 'Protected comment fields',
                'post': self.closed_post.pk,
                'author': self.other_user.pk,
                'status': Comment.Status.REMOVED,
                'moderation_feedback': 'Fake feedback',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        comment = Comment.objects.get(pk=response.data['id'])
        self.assertEqual(comment.post, self.public_post)
        self.assertEqual(comment.author, self.commenter)
        self.assertEqual(comment.status, Comment.Status.APPROVED)
        self.assertEqual(comment.moderation_feedback, '')

    def test_user_cannot_submit_comment_when_comments_are_closed(self):
        self.client.force_login(self.commenter)

        response = self.client.post(
            self.comments_url(self.closed_post),
            {'content': 'Comment on closed post'},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            str(response.data['detail']),
            'Comments are closed for this post.',
        )

    def test_user_cannot_submit_comment_to_non_public_post(self):
        self.client.force_login(self.commenter)

        for post in (self.draft_post, self.removed_post):
            with self.subTest(post_status=post.status):
                response = self.client.post(
                    self.comments_url(post),
                    {'content': 'Comment on private post'},
                    format='json',
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_404_NOT_FOUND,
                )

    def test_whitespace_only_comment_is_rejected_by_api(self):
        self.client.force_login(self.commenter)

        response = self.client.post(
            self.comments_url(self.public_post),
            {'content': '   '},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            str(response.data['content'][0]),
            'Comment content cannot be empty.',
        )

    def test_comment_content_cannot_exceed_maximum_length(self):
        self.client.force_login(self.commenter)

        response = self.client.post(
            self.comments_url(self.public_post),
            {'content': 'a' * 2001},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('content', response.data)

    def test_comment_submission_requires_csrf_token(self):
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.force_login(self.commenter)

        response = csrf_client.post(
            self.comments_url(self.public_post),
            {'content': 'Missing CSRF token'},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_public_comment_list_is_paginated(self):
        for number in range(9):
            Comment.objects.create(
                post=self.public_post,
                author=self.commenter,
                content=f'Extra approved comment {number}',
                status=Comment.Status.APPROVED,
            )

        response = self.client.get(self.comments_url(self.public_post))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 11)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNone(response.data['previous'])

    def test_update_and_delete_methods_are_not_allowed(self):
        url = self.comments_url(self.public_post)

        for method in ('patch', 'delete'):
            with self.subTest(method=method):
                response = getattr(self.client, method)(
                    url,
                    {'content': 'Not allowed'},
                    format='json',
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_405_METHOD_NOT_ALLOWED,
                )


class AuthorCommentListAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.author = user_model.objects.create_user(
            username='comment-history-author',
            password='StrongPassword123!',
        )
        cls.other_author = user_model.objects.create_user(
            username='comment-history-other',
            password='StrongPassword123!',
        )
        cls.post = Post.objects.create(
            title='Comment history post',
            status=Post.Status.PUBLISHED,
        )
        cls.approved_comment = Comment.objects.create(
            post=cls.post,
            author=cls.author,
            content='A public contribution.',
            status=Comment.Status.APPROVED,
        )
        cls.removed_comment = Comment.objects.create(
            post=cls.post,
            author=cls.author,
            content='A moderated contribution.',
            status=Comment.Status.REMOVED,
            moderation_feedback='Please keep comments on topic.',
        )
        Comment.objects.create(
            post=cls.post,
            author=cls.other_author,
            content='Another author comment.',
        )
        cls.url = reverse('blog:author-comment-list')

    def test_anonymous_visitor_cannot_open_comment_history(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_author_sees_only_their_comments_and_removal_feedback(self):
        self.client.force_login(self.author)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(
            {item['id'] for item in response.data['results']},
            {self.approved_comment.pk, self.removed_comment.pk},
        )
        removed_data = next(
            item
            for item in response.data['results']
            if item['id'] == self.removed_comment.pk
        )
        self.assertEqual(removed_data['post_title'], self.post.title)
        self.assertEqual(removed_data['post_slug'], self.post.slug)
        self.assertEqual(
            removed_data['post_status'],
            Post.Status.PUBLISHED,
        )
        self.assertEqual(
            removed_data['moderation_feedback'],
            'Please keep comments on topic.',
        )

    def test_comment_history_is_read_only(self):
        self.client.force_login(self.author)

        response = self.client.post(
            self.url,
            {'content': 'Not allowed'},
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

            if post_status == Post.Status.REMOVED:
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

        removed_post_data = next(
            post_data
            for post_data in response.data['results']
            if post_data['status'] == Post.Status.REMOVED
        )
        self.assertEqual(
            removed_post_data['review_feedback'],
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
        for number in range(7):
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


class AuthorPostDetailAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.author = user_model.objects.create_user(
            username='detail-author',
            password='StrongPassword123!',
        )
        cls.other_author = user_model.objects.create_user(
            username='detail-other-author',
            password='StrongPassword123!',
        )
        cls.category = Category.objects.create(
            name='Backend',
            slug='backend',
        )
        cls.tag = Tag.objects.create(
            name='Python',
            slug='python',
        )
        cls.draft_post = Post.objects.create(
            title='Editable draft',
            content='Original draft content',
            author=cls.author,
            status=Post.Status.DRAFT,
        )
        cls.published_post = Post.objects.create(
            title='Published article',
            content='Original published content',
            author=cls.author,
            status=Post.Status.PUBLISHED,
        )
        cls.removed_post = Post.objects.create(
            title='Removed article',
            content='Original removed content',
            author=cls.author,
            status=Post.Status.REMOVED,
            review_feedback='Rewrite the introduction.',
        )
        cls.other_post = Post.objects.create(
            title='Other author draft',
            author=cls.other_author,
            status=Post.Status.DRAFT,
        )

    @staticmethod
    def detail_url(post):
        return reverse(
            'blog:author-post-detail',
            kwargs={'pk': post.pk},
        )

    def test_anonymous_visitor_cannot_retrieve_private_post(self):
        response = self.client.get(self.detail_url(self.draft_post))

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_author_can_retrieve_owned_post(self):
        self.client.force_login(self.author)

        response = self.client.get(self.detail_url(self.draft_post))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.draft_post.pk)
        self.assertEqual(response.data['title'], 'Editable draft')
        self.assertEqual(
            response.data['content'],
            'Original draft content',
        )
        self.assertEqual(response.data['status'], Post.Status.DRAFT)

    def test_other_author_cannot_retrieve_post(self):
        self.client.force_login(self.other_author)

        response = self.client.get(self.detail_url(self.draft_post))

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_other_author_cannot_update_post(self):
        self.client.force_login(self.other_author)

        response = self.client.patch(
            self.detail_url(self.draft_post),
            {'title': 'Unauthorized title'},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.draft_post.refresh_from_db()
        self.assertEqual(self.draft_post.title, 'Editable draft')

    def test_other_author_cannot_delete_post(self):
        self.client.force_login(self.other_author)

        response = self.client.delete(self.detail_url(self.draft_post))

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertTrue(
            Post.objects.filter(pk=self.draft_post.pk).exists(),
        )

    def test_author_can_update_editable_fields_on_draft(self):
        self.client.force_login(self.author)

        response = self.client.patch(
            self.detail_url(self.draft_post),
            {
                'title': 'Updated draft',
                'content': 'Updated draft content',
                'category': self.category.pk,
                'tags': [self.tag.pk],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.draft_post.refresh_from_db()
        self.assertEqual(self.draft_post.title, 'Updated draft')
        self.assertEqual(
            self.draft_post.content,
            'Updated draft content',
        )
        self.assertEqual(self.draft_post.category, self.category)
        self.assertEqual(list(self.draft_post.tags.all()), [self.tag])
        self.assertEqual(self.draft_post.status, Post.Status.DRAFT)

    def test_author_cannot_update_protected_fields(self):
        self.client.force_login(self.author)

        response = self.client.patch(
            self.detail_url(self.draft_post),
            {
                'author': self.other_author.pk,
                'status': Post.Status.PUBLISHED,
                'review_feedback': 'Fake feedback',
                'published_at': timezone.now().isoformat(),
                'is_featured': True,
                'views': 999,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.draft_post.refresh_from_db()
        self.assertEqual(self.draft_post.author, self.author)
        self.assertEqual(self.draft_post.status, Post.Status.DRAFT)
        self.assertEqual(self.draft_post.review_feedback, '')
        self.assertIsNone(self.draft_post.published_at)
        self.assertFalse(self.draft_post.is_featured)
        self.assertEqual(self.draft_post.views, 0)

    def test_published_post_stays_public_after_author_edit(self):
        self.client.force_login(self.author)

        response = self.client.patch(
            self.detail_url(self.published_post),
            {'excerpt': 'Edited by the author.'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.published_post.refresh_from_db()
        self.assertEqual(
            self.published_post.status,
            Post.Status.PUBLISHED,
        )
        self.assertTrue(self.published_post.is_public)

    def test_read_only_input_does_not_change_published_workflow_status(self):
        self.client.force_login(self.author)

        response = self.client.patch(
            self.detail_url(self.published_post),
            {'status': Post.Status.DRAFT},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.published_post.refresh_from_db()
        self.assertEqual(
            self.published_post.status,
            Post.Status.PUBLISHED,
        )
        self.assertTrue(self.published_post.is_public)

    def test_removed_post_becomes_draft_after_edit(self):
        self.client.force_login(self.author)

        response = self.client.patch(
            self.detail_url(self.removed_post),
            {'content': 'A rewritten introduction.'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.removed_post.refresh_from_db()
        self.assertEqual(self.removed_post.status, Post.Status.DRAFT)
        self.assertEqual(
            self.removed_post.review_feedback,
            'Rewrite the introduction.',
        )

    def test_authenticated_update_requires_csrf_token(self):
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.force_login(self.author)

        response = csrf_client.patch(
            self.detail_url(self.draft_post),
            {'title': 'Missing CSRF update'},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.draft_post.refresh_from_db()
        self.assertEqual(self.draft_post.title, 'Editable draft')

    def test_author_can_delete_owned_post(self):
        self.client.force_login(self.author)

        response = self.client.delete(self.detail_url(self.draft_post))

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )
        self.assertFalse(
            Post.objects.filter(pk=self.draft_post.pk).exists(),
        )


class AuthorPostPublishAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.author = user_model.objects.create_user(
            username='publish-author',
            password='StrongPassword123!',
        )
        cls.other_author = user_model.objects.create_user(
            username='publish-other-author',
            password='StrongPassword123!',
        )
        cls.draft_post = Post.objects.create(
            title='Ready draft',
            author=cls.author,
            status=Post.Status.DRAFT,
        )
        cls.removed_post = Post.objects.create(
            title='Corrected removed post',
            author=cls.author,
            status=Post.Status.REMOVED,
            review_feedback='Improve the conclusion.',
        )
        cls.published_post = Post.objects.create(
            title='Already published',
            author=cls.author,
            status=Post.Status.PUBLISHED,
        )
        cls.archived_post = Post.objects.create(
            title='Archived post',
            author=cls.author,
            status=Post.Status.ARCHIVED,
        )
        cls.invalid_draft = Post.objects.create(
            title='Draft with inaccessible image',
            author=cls.author,
            status=Post.Status.DRAFT,
            featured_image='posts/missing-alt.jpg',
        )
        cls.other_post = Post.objects.create(
            title='Another author draft',
            author=cls.other_author,
            status=Post.Status.DRAFT,
        )

    @staticmethod
    def publish_url(post):
        return reverse(
            'blog:author-post-publish',
            kwargs={'pk': post.pk},
        )

    def test_anonymous_visitor_cannot_publish_post(self):
        response = self.client.post(self.publish_url(self.draft_post))

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.draft_post.refresh_from_db()
        self.assertEqual(self.draft_post.status, Post.Status.DRAFT)

    def test_author_can_publish_draft_immediately(self):
        self.client.force_login(self.author)

        response = self.client.post(self.publish_url(self.draft_post))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.draft_post.refresh_from_db()
        self.assertEqual(
            self.draft_post.status,
            Post.Status.PUBLISHED,
        )
        self.assertEqual(
            response.data['status'],
            Post.Status.PUBLISHED,
        )
        self.assertIsNotNone(self.draft_post.published_at)

    def test_author_can_republish_removed_post_and_feedback_is_cleared(self):
        self.client.force_login(self.author)

        response = self.client.post(self.publish_url(self.removed_post))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.removed_post.refresh_from_db()
        self.assertEqual(
            self.removed_post.status,
            Post.Status.PUBLISHED,
        )
        self.assertEqual(self.removed_post.review_feedback, '')
        self.assertEqual(response.data['review_feedback'], '')

    def test_posts_in_other_statuses_cannot_be_published(self):
        self.client.force_login(self.author)
        invalid_posts = (
            self.published_post,
            self.archived_post,
        )

        for post in invalid_posts:
            with self.subTest(post_status=post.status):
                response = self.client.post(self.publish_url(post))

                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn('status', response.data)
                post.refresh_from_db()
                self.assertNotEqual(post.status, Post.Status.DRAFT)

    def test_invalid_draft_cannot_be_published(self):
        self.client.force_login(self.author)

        response = self.client.post(self.publish_url(self.invalid_draft))

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('featured_image_alt', response.data)
        self.invalid_draft.refresh_from_db()
        self.assertEqual(
            self.invalid_draft.status,
            Post.Status.DRAFT,
        )

    def test_author_cannot_publish_another_authors_post(self):
        self.client.force_login(self.author)

        response = self.client.post(self.publish_url(self.other_post))

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.other_post.refresh_from_db()
        self.assertEqual(self.other_post.status, Post.Status.DRAFT)

    def test_publish_requires_csrf_token(self):
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.force_login(self.author)

        response = csrf_client.post(self.publish_url(self.draft_post))

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.draft_post.refresh_from_db()
        self.assertEqual(self.draft_post.status, Post.Status.DRAFT)

    def test_get_method_is_not_allowed(self):
        self.client.force_login(self.author)

        response = self.client.get(self.publish_url(self.draft_post))

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class AuthorPostBlockAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.author = user_model.objects.create_user(
            username='block-author',
            password='StrongPassword123!',
        )
        cls.other_author = user_model.objects.create_user(
            username='block-other-author',
            password='StrongPassword123!',
        )
        cls.draft_post = Post.objects.create(
            title='Block editor draft',
            author=cls.author,
            status=Post.Status.DRAFT,
        )
        cls.published_post = Post.objects.create(
            title='Published block editor post',
            author=cls.author,
            status=Post.Status.PUBLISHED,
        )
        cls.published_delete_post = Post.objects.create(
            title='Published block delete post',
            author=cls.author,
            status=Post.Status.PUBLISHED,
        )
        cls.removed_post = Post.objects.create(
            title='Removed block editor post',
            author=cls.author,
            status=Post.Status.REMOVED,
            review_feedback='Add another section.',
        )
        cls.other_post = Post.objects.create(
            title='Other author block post',
            author=cls.other_author,
            status=Post.Status.DRAFT,
        )

        cls.first_block = PostBlock.objects.create(
            post=cls.draft_post,
            block_type=PostBlock.BlockType.RICH_TEXT,
            position=0,
            content='<p>First block</p>',
        )
        cls.last_block = PostBlock.objects.create(
            post=cls.draft_post,
            block_type=PostBlock.BlockType.QUOTE,
            position=2,
            content='Last block',
            quote_attribution='Author',
        )
        cls.published_block = PostBlock.objects.create(
            post=cls.published_post,
            block_type=PostBlock.BlockType.RICH_TEXT,
            position=0,
            content='Published block',
        )
        cls.published_delete_block = PostBlock.objects.create(
            post=cls.published_delete_post,
            block_type=PostBlock.BlockType.RICH_TEXT,
            position=0,
            content='Published block to delete',
        )
        cls.other_block = PostBlock.objects.create(
            post=cls.other_post,
            block_type=PostBlock.BlockType.RICH_TEXT,
            position=0,
            content='Other author block',
        )

    @staticmethod
    def block_list_url(post):
        return reverse(
            'blog:author-post-block-list',
            kwargs={'post_pk': post.pk},
        )

    @staticmethod
    def block_detail_url(post, block):
        return reverse(
            'blog:author-post-block-detail',
            kwargs={
                'post_pk': post.pk,
                'pk': block.pk,
            },
        )

    @staticmethod
    def block_reorder_url(post):
        return reverse(
            'blog:author-post-block-reorder',
            kwargs={'post_pk': post.pk},
        )

    def test_anonymous_visitor_cannot_list_private_blocks(self):
        response = self.client.get(self.block_list_url(self.draft_post))

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_author_can_list_owned_post_blocks_in_position_order(self):
        self.client.force_login(self.author)

        response = self.client.get(self.block_list_url(self.draft_post))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(
            [block_data['id'] for block_data in response.data],
            [self.first_block.pk, self.last_block.pk],
        )

    def test_other_author_cannot_list_post_blocks(self):
        self.client.force_login(self.other_author)

        response = self.client.get(self.block_list_url(self.draft_post))

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_author_can_create_block_and_cannot_forge_parent_post(self):
        self.client.force_login(self.author)

        response = self.client.post(
            self.block_list_url(self.draft_post),
            {
                'post': self.other_post.pk,
                'block_type': PostBlock.BlockType.RICH_TEXT,
                'position': 1,
                'content': '<p>New middle block</p>',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        block = PostBlock.objects.get(pk=response.data['id'])
        self.assertEqual(block.post, self.draft_post)
        self.assertEqual(block.position, 1)
        self.assertEqual(block.content, '<p>New middle block</p>')

    def test_required_data_is_validated_for_each_content_block_type(self):
        self.client.force_login(self.author)
        invalid_blocks = (
            (
                {'block_type': PostBlock.BlockType.RICH_TEXT},
                'content',
            ),
            (
                {'block_type': PostBlock.BlockType.QUOTE},
                'content',
            ),
            (
                {'block_type': PostBlock.BlockType.IMAGE},
                'image',
            ),
            (
                {'block_type': PostBlock.BlockType.VIDEO},
                'video_url',
            ),
        )

        for payload, expected_error_field in invalid_blocks:
            with self.subTest(block_type=payload['block_type']):
                response = self.client.post(
                    self.block_list_url(self.draft_post),
                    payload,
                    format='json',
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn(expected_error_field, response.data)

    def test_divider_block_does_not_require_content(self):
        self.client.force_login(self.author)

        response = self.client.post(
            self.block_list_url(self.draft_post),
            {
                'block_type': PostBlock.BlockType.DIVIDER,
                'position': 1,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        block = PostBlock.objects.get(pk=response.data['id'])
        self.assertEqual(block.block_type, PostBlock.BlockType.DIVIDER)
        self.assertEqual(block.content, '')

    def test_author_can_upload_an_accessible_image_block(self):
        self.client.force_login(self.author)
        image_bytes = (
            b'GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00'
            b'\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00'
            b'\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
        )
        image = SimpleUploadedFile(
            'architecture.gif',
            image_bytes,
            content_type='image/gif',
        )

        with tempfile.TemporaryDirectory() as media_root:
            with self.settings(MEDIA_ROOT=media_root):
                response = self.client.post(
                    self.block_list_url(self.draft_post),
                    {
                        'block_type': PostBlock.BlockType.IMAGE,
                        'position': 1,
                        'image': image,
                        'image_alt': 'Application request flow',
                        'caption': 'Django and React communication',
                        'image_width': PostBlock.ImageWidth.WIDE,
                    },
                    format='multipart',
                )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(
            response.data['image_alt'],
            'Application request flow',
        )
        self.assertEqual(
            response.data['image_width'],
            PostBlock.ImageWidth.WIDE,
        )

    def test_author_can_update_and_reorder_owned_block(self):
        self.client.force_login(self.author)

        response = self.client.patch(
            self.block_detail_url(self.draft_post, self.last_block),
            {
                'position': 1,
                'content': 'Updated quote',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.last_block.refresh_from_db()
        self.assertEqual(self.last_block.position, 1)
        self.assertEqual(self.last_block.content, 'Updated quote')

    def test_author_can_atomically_reorder_all_owned_blocks(self):
        self.client.force_login(self.author)

        response = self.client.put(
            self.block_reorder_url(self.draft_post),
            {
                'block_ids': [
                    self.last_block.pk,
                    self.first_block.pk,
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [block_data['id'] for block_data in response.data],
            [self.last_block.pk, self.first_block.pk],
        )
        self.last_block.refresh_from_db()
        self.first_block.refresh_from_db()
        self.assertEqual(self.last_block.position, 0)
        self.assertEqual(self.first_block.position, 1)

    def test_reorder_requires_each_post_block_exactly_once(self):
        self.client.force_login(self.author)
        original_positions = {
            self.first_block.pk: self.first_block.position,
            self.last_block.pk: self.last_block.position,
        }

        for block_ids in (
            [self.first_block.pk],
            [self.first_block.pk, self.first_block.pk],
            [self.first_block.pk, self.other_block.pk],
        ):
            with self.subTest(block_ids=block_ids):
                response = self.client.put(
                    self.block_reorder_url(self.draft_post),
                    {'block_ids': block_ids},
                    format='json',
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn('block_ids', response.data)

        self.first_block.refresh_from_db()
        self.last_block.refresh_from_db()
        self.assertEqual(
            {
                self.first_block.pk: self.first_block.position,
                self.last_block.pk: self.last_block.position,
            },
            original_positions,
        )

    def test_other_author_cannot_reorder_post_blocks(self):
        self.client.force_login(self.other_author)

        response = self.client.put(
            self.block_reorder_url(self.draft_post),
            {
                'block_ids': [
                    self.last_block.pk,
                    self.first_block.pk,
                ],
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_changing_block_type_requires_new_types_data(self):
        self.client.force_login(self.author)

        response = self.client.patch(
            self.block_detail_url(self.draft_post, self.first_block),
            {'block_type': PostBlock.BlockType.VIDEO},
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('video_url', response.data)
        self.first_block.refresh_from_db()
        self.assertEqual(
            self.first_block.block_type,
            PostBlock.BlockType.RICH_TEXT,
        )

    def test_other_author_cannot_manage_block(self):
        self.client.force_login(self.other_author)
        url = self.block_detail_url(self.draft_post, self.first_block)

        retrieve_response = self.client.get(url)
        update_response = self.client.patch(
            url,
            {'content': 'Unauthorized edit'},
            format='json',
        )
        delete_response = self.client.delete(url)

        for response in (
            retrieve_response,
            update_response,
            delete_response,
        ):
            self.assertEqual(
                response.status_code,
                status.HTTP_404_NOT_FOUND,
            )

        self.assertTrue(
            PostBlock.objects.filter(pk=self.first_block.pk).exists(),
        )

    def test_block_must_belong_to_post_in_url(self):
        self.client.force_login(self.author)

        response = self.client.get(
            self.block_detail_url(
                self.published_post,
                self.first_block,
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_editing_published_post_block_keeps_post_public(self):
        self.published_post.refresh_from_db()
        self.client.force_login(self.author)

        response = self.client.patch(
            self.block_detail_url(
                self.published_post,
                self.published_block,
            ),
            {'content': 'Edited published block'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.published_post.refresh_from_db()
        self.assertEqual(
            self.published_post.status,
            Post.Status.PUBLISHED,
        )
        self.assertTrue(self.published_post.is_public)

    def test_adding_block_to_removed_post_returns_post_to_draft(self):
        self.removed_post.refresh_from_db()
        self.client.force_login(self.author)

        response = self.client.post(
            self.block_list_url(self.removed_post),
            {
                'block_type': PostBlock.BlockType.RICH_TEXT,
                'content': 'A new section',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.removed_post.refresh_from_db()
        self.assertEqual(
            self.removed_post.status,
            Post.Status.DRAFT,
        )
        self.assertEqual(
            self.removed_post.review_feedback,
            'Add another section.',
        )

    def test_deleting_published_block_keeps_post_public(self):
        self.published_delete_post.refresh_from_db()
        self.client.force_login(self.author)

        response = self.client.delete(
            self.block_detail_url(
                self.published_delete_post,
                self.published_delete_block,
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )
        self.assertFalse(
            PostBlock.objects.filter(
                pk=self.published_delete_block.pk,
            ).exists(),
        )
        self.published_delete_post.refresh_from_db()
        self.assertEqual(
            self.published_delete_post.status,
            Post.Status.PUBLISHED,
        )

    def test_block_creation_requires_csrf_token(self):
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.force_login(self.author)

        response = csrf_client.post(
            self.block_list_url(self.draft_post),
            {
                'block_type': PostBlock.BlockType.RICH_TEXT,
                'content': 'Missing CSRF token',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )


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
            status=Post.Status.PUBLISHED,
            published_at=timezone.now() + timedelta(days=1),
        )

        self.assertEqual(list(Post.objects.published()), [public_post])

    def test_published_post_with_due_publication_time_is_public(self):
        post = Post.objects.create(
            title='Published post',
            content='Text',
            status=Post.Status.PUBLISHED,
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
