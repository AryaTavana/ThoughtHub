from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import Comment, Notification, Post, SavedPost, Tag


User = get_user_model()


def create_published_post(*, author, title='Published thought'):
    return Post.objects.create(
        author=author,
        title=title,
        excerpt='A useful university idea.',
        content='<p>ThoughtHub content.</p>',
        status=Post.Status.PUBLISHED,
        published_at=timezone.now(),
    )


class PublicPostSearchTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='search-author',
            password='safe-test-password',
        )
        self.quantum_post = create_published_post(
            author=self.author,
            title='Quantum Computing on Campus',
        )
        self.django_post = create_published_post(
            author=self.author,
            title='A Django Study Guide',
        )
        quantum_tag = Tag.objects.create(
            name='Quantum',
            slug='quantum',
        )
        self.quantum_post.tags.add(quantum_tag)
        Post.objects.create(
            author=self.author,
            title='Private Quantum Draft',
            status=Post.Status.DRAFT,
        )

    def test_search_filters_all_public_post_fields(self):
        response = self.client.get(
            reverse('blog:public-post-list'),
            {'search': 'quantum'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(
            response.data['results'][0]['slug'],
            self.quantum_post.slug,
        )

    def test_empty_search_keeps_the_normal_published_list(self):
        response = self.client.get(
            reverse('blog:public-post-list'),
            {'search': '   '},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)


class SavedPostApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='saved-reader',
            password='safe-test-password',
        )
        self.other_user = User.objects.create_user(
            username='other-reader',
            password='safe-test-password',
        )
        self.author = User.objects.create_user(
            username='saved-author',
            password='safe-test-password',
        )
        self.post = create_published_post(author=self.author)
        self.draft = Post.objects.create(
            author=self.author,
            title='Private draft',
            status=Post.Status.DRAFT,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.list_url = reverse('blog:saved-post-list')

    def test_user_can_save_list_and_remove_a_post(self):
        create_response = self.client.post(
            self.list_url,
            {'post_slug': self.post.slug},
            format='json',
        )

        self.assertEqual(
            create_response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(create_response.data['post']['slug'], self.post.slug)

        duplicate_response = self.client.post(
            self.list_url,
            {'post_slug': self.post.slug},
            format='json',
        )
        self.assertEqual(duplicate_response.status_code, status.HTTP_200_OK)
        self.assertEqual(SavedPost.objects.count(), 1)

        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]['post']['slug'], self.post.slug)

        delete_response = self.client.delete(
            reverse('blog:saved-post-detail', args=(self.post.slug,)),
        )
        self.assertEqual(
            delete_response.status_code,
            status.HTTP_204_NO_CONTENT,
        )
        self.assertFalse(SavedPost.objects.exists())

    def test_saved_posts_are_private_to_each_user(self):
        SavedPost.objects.create(user=self.other_user, post=self.post)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_private_post_cannot_be_saved(self):
        response = self.client.post(
            self.list_url,
            {'post_slug': self.draft.slug},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class NotificationApiTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username='notification-author',
            password='safe-test-password',
        )
        self.reader = User.objects.create_user(
            username='notification-reader',
            password='safe-test-password',
        )
        self.post = create_published_post(author=self.author)
        self.client = APIClient()

    def test_comment_and_moderation_events_create_notifications(self):
        comment = Comment.objects.create(
            post=self.post,
            author=self.reader,
            content='This is a useful thought.',
            status=Comment.Status.APPROVED,
        )

        author_notification = Notification.objects.get(
            recipient=self.author,
            kind=Notification.Kind.NEW_COMMENT,
        )
        self.assertEqual(author_notification.actor, self.reader)
        self.assertEqual(author_notification.comment, comment)

        Comment.objects.create(
            post=self.post,
            author=self.author,
            content='Author reply.',
            status=Comment.Status.APPROVED,
        )
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.author,
                kind=Notification.Kind.NEW_COMMENT,
            ).count(),
            1,
        )

        comment.remove(feedback='Please keep replies focused on the topic.')
        comment.save(
            update_fields=('status', 'moderation_feedback', 'updated_at'),
        )
        reader_notification = Notification.objects.get(
            recipient=self.reader,
            kind=Notification.Kind.COMMENT_REMOVED,
        )
        self.assertIn('focused', reader_notification.message)

        self.post.remove(feedback='Please remove private information.')
        self.post.save(
            update_fields=('status', 'review_feedback', 'updated_at'),
        )
        removal_notification = Notification.objects.get(
            recipient=self.author,
            kind=Notification.Kind.POST_REMOVED,
        )
        self.assertIn('private information', removal_notification.message)

    def test_user_can_list_and_mark_only_their_notifications_read(self):
        own_notification = Notification.objects.create(
            recipient=self.author,
            post=self.post,
            kind=Notification.Kind.NEW_COMMENT,
            title='New comment',
            message='A reader commented.',
        )
        other_notification = Notification.objects.create(
            recipient=self.reader,
            post=self.post,
            kind=Notification.Kind.NEW_COMMENT,
            title='Other notification',
            message='Private to another user.',
        )
        self.client.force_authenticate(self.author)

        list_response = self.client.get(reverse('blog:notification-list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]['id'], own_notification.pk)

        count_response = self.client.get(
            reverse('blog:notification-unread-count'),
        )
        self.assertEqual(count_response.data, {'count': 1})

        patch_response = self.client.patch(
            reverse('blog:notification-detail', args=(own_notification.pk,)),
            {'is_read': True},
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        own_notification.refresh_from_db()
        self.assertTrue(own_notification.is_read)

        forbidden_response = self.client.patch(
            reverse('blog:notification-detail', args=(other_notification.pk,)),
            {'is_read': True},
            format='json',
        )
        self.assertEqual(forbidden_response.status_code, status.HTTP_404_NOT_FOUND)

        mark_all_response = self.client.post(
            reverse('blog:notification-mark-all-read'),
        )
        self.assertEqual(mark_all_response.status_code, status.HTTP_200_OK)
        self.assertEqual(mark_all_response.data, {'updated': 0})
