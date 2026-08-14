from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from Blog.models import Category, Post, PostBlock, Tag


User = get_user_model()


class CSRFTokenAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.url = reverse('account:csrf-token')

    def test_anonymous_user_receives_csrf_cookie(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {'detail': 'CSRF cookie set.'},
        )
        self.assertIn(settings.CSRF_COOKIE_NAME, response.cookies)
        self.assertTrue(
            response.cookies[settings.CSRF_COOKIE_NAME].value,
        )

    def test_post_method_is_not_allowed(self):
        response = self.client.post(self.url, format='json')

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class RegistrationAPITests(APITestCase):
    password = 'Complex!Passphrase-47'

    @classmethod
    def setUpTestData(cls):
        cls.existing_user = User.objects.create_user(
            username='existing-user',
            email='existing@example.com',
            password='Existing!Passphrase-47',
        )
        cls.csrf_url = reverse('account:csrf-token')
        cls.register_url = reverse('account:register')
        cls.me_url = reverse('account:current-user')

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def get_csrf_token(self, client=None):
        client = client or self.client
        response = client.get(self.csrf_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.cookies[settings.CSRF_COOKIE_NAME].value

    def registration_payload(self, **overrides):
        payload = {
            'username': 'new-author',
            'email': 'AUTHOR@EXAMPLE.COM',
            'first_name': 'New',
            'last_name': 'Author',
            'password': self.password,
            'password_confirm': self.password,
        }
        payload.update(overrides)
        return payload

    def test_registration_without_csrf_token_is_rejected(self):
        response = self.client.post(
            self.register_url,
            self.registration_payload(),
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertFalse(
            User.objects.filter(username='new-author').exists()
        )

    def test_registration_creates_hashed_user_and_authenticated_session(self):
        initial_user_count = User.objects.count()
        csrf_token = self.get_csrf_token()

        response = self.client.post(
            self.register_url,
            self.registration_payload(),
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(User.objects.count(), initial_user_count + 1)

        user = User.objects.get(username='new-author')
        self.assertEqual(user.email, 'author@example.com')
        self.assertEqual(user.first_name, 'New')
        self.assertEqual(user.last_name, 'Author')
        self.assertTrue(user.check_password(self.password))
        self.assertNotEqual(user.password, self.password)

        self.assertEqual(
            set(response.data),
            {
                'id',
                'username',
                'email',
                'first_name',
                'last_name',
                'is_staff',
            },
        )
        self.assertNotIn('password', response.data)
        self.assertNotIn('password_confirm', response.data)
        self.assertIn(settings.SESSION_COOKIE_NAME, response.cookies)

        me_response = self.client.get(self.me_url)
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data['id'], user.id)

    def test_registration_rejects_mismatched_passwords(self):
        csrf_token = self.get_csrf_token()

        response = self.client.post(
            self.register_url,
            self.registration_payload(
                password_confirm='Different!Passphrase-47',
            ),
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('password_confirm', response.data)
        self.assertFalse(
            User.objects.filter(username='new-author').exists()
        )

    def test_registration_applies_django_password_validation(self):
        csrf_token = self.get_csrf_token()

        response = self.client.post(
            self.register_url,
            self.registration_payload(
                password='password',
                password_confirm='password',
            ),
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('password', response.data)

    def test_registration_rejects_duplicate_username(self):
        csrf_token = self.get_csrf_token()

        response = self.client.post(
            self.register_url,
            self.registration_payload(
                username=self.existing_user.username,
                email='different@example.com',
            ),
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('username', response.data)

    def test_registration_rejects_case_insensitive_duplicate_email(self):
        csrf_token = self.get_csrf_token()

        response = self.client.post(
            self.register_url,
            self.registration_payload(
                username='different-user',
                email='EXISTING@EXAMPLE.COM',
            ),
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('email', response.data)

    def test_registration_requires_all_account_fields(self):
        required_fields = (
            'username',
            'email',
            'password',
            'password_confirm',
        )

        for missing_field in required_fields:
            with self.subTest(missing_field=missing_field):
                client = APIClient(enforce_csrf_checks=True)
                csrf_token = self.get_csrf_token(client)
                payload = self.registration_payload()
                payload.pop(missing_field)

                response = client.post(
                    self.register_url,
                    payload,
                    format='json',
                    HTTP_X_CSRFTOKEN=csrf_token,
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn(missing_field, response.data)

    def test_get_method_is_not_allowed(self):
        response = self.client.get(self.register_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class LoginAPITests(APITestCase):
    password = 'Strong-test-password-123'

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='arya',
            email='arya@example.com',
            password=cls.password,
        )
        cls.csrf_url = reverse('account:csrf-token')
        cls.login_url = reverse('account:login')
        cls.me_url = reverse('account:current-user')

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def get_csrf_token(self, client=None):
        client = client or self.client
        response = client.get(self.csrf_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.cookies[settings.CSRF_COOKIE_NAME].value

    def test_login_without_csrf_token_is_rejected(self):
        response = self.client.post(
            self.login_url,
            {
                'username': self.user.username,
                'password': self.password,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertNotIn(settings.SESSION_COOKIE_NAME, response.cookies)

    def test_valid_credentials_create_session_and_unlock_me_endpoint(self):
        csrf_token = self.get_csrf_token()

        response = self.client.post(
            self.login_url,
            {
                'username': self.user.username,
                'password': self.password,
            },
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.user.id)
        self.assertEqual(response.data['username'], self.user.username)
        self.assertNotIn('password', response.data)
        self.assertIn(settings.SESSION_COOKIE_NAME, response.cookies)
        self.assertIn(settings.CSRF_COOKIE_NAME, response.cookies)
        self.assertNotEqual(
            response.cookies[settings.CSRF_COOKIE_NAME].value,
            csrf_token,
        )

        me_response = self.client.get(self.me_url)

        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data['id'], self.user.id)

    def test_trusted_frontend_origin_can_log_in_through_vite(self):
        csrf_token = self.get_csrf_token()

        response = self.client.post(
            self.login_url,
            {
                'username': self.user.username,
                'password': self.password,
            },
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
            HTTP_ORIGIN='http://localhost:5173',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user.username)

    def test_invalid_credentials_do_not_create_session(self):
        csrf_token = self.get_csrf_token()

        response = self.client.post(
            self.login_url,
            {
                'username': self.user.username,
                'password': 'incorrect-password',
            },
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('credentials', response.data)
        self.assertNotIn(settings.SESSION_COOKIE_NAME, response.cookies)

        me_response = self.client.get(self.me_url)
        self.assertEqual(
            me_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_login_requires_username_and_password(self):
        missing_field_cases = (
            ({'password': self.password}, 'username'),
            ({'username': self.user.username}, 'password'),
        )

        for payload, missing_field in missing_field_cases:
            with self.subTest(missing_field=missing_field):
                client = APIClient(enforce_csrf_checks=True)
                csrf_token = self.get_csrf_token(client)

                response = client.post(
                    self.login_url,
                    payload,
                    format='json',
                    HTTP_X_CSRFTOKEN=csrf_token,
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn(missing_field, response.data)
                self.assertNotIn(
                    settings.SESSION_COOKIE_NAME,
                    response.cookies,
                )


class LogoutAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='arya',
            password='Strong-test-password-123',
        )
        cls.csrf_url = reverse('account:csrf-token')
        cls.logout_url = reverse('account:logout')
        cls.me_url = reverse('account:current-user')

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def get_csrf_token(self):
        response = self.client.get(self.csrf_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.cookies[settings.CSRF_COOKIE_NAME].value

    def test_anonymous_user_cannot_log_out(self):
        csrf_token = self.get_csrf_token()

        response = self.client.post(
            self.logout_url,
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_authenticated_logout_requires_csrf_token(self):
        self.client.force_login(self.user)

        response = self.client.post(
            self.logout_url,
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        me_response = self.client.get(self.me_url)
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)

    def test_logout_destroys_session_and_locks_me_endpoint(self):
        self.client.force_login(self.user)
        csrf_token = self.get_csrf_token()

        response = self.client.post(
            self.logout_url,
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'detail': 'Logged out.'})

        me_response = self.client.get(self.me_url)
        self.assertEqual(
            me_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_get_method_is_not_allowed(self):
        self.client.force_login(self.user)

        response = self.client.get(self.logout_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class CurrentUserAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='arya',
            email='arya@example.com',
            password='Strong-test-password-123',
        )
        cls.url = reverse('account:current-user')

    def test_anonymous_user_is_rejected(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_authenticated_user_receives_own_information(self):
        logged_in = self.client.login(
            username='arya',
            password='Strong-test-password-123',
        )
        self.assertTrue(logged_in)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.user.id)
        self.assertEqual(response.data['username'], 'arya')
        self.assertEqual(response.data['email'], 'arya@example.com')
        self.assertFalse(response.data['is_staff'])
        self.assertNotIn('password', response.data)

    def test_authenticated_user_can_update_public_identity_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {
                'email': 'NEW-ARYA@EXAMPLE.COM',
                'first_name': 'Arya',
                'last_name': 'Tavana',
                'username': 'cannot-change-this',
                'is_staff': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'arya')
        self.assertEqual(self.user.email, 'new-arya@example.com')
        self.assertEqual(self.user.first_name, 'Arya')
        self.assertEqual(self.user.last_name, 'Tavana')
        self.assertFalse(self.user.is_staff)

    def test_profile_update_rejects_another_users_email(self):
        User.objects.create_user(
            username='email-owner',
            email='owner@example.com',
            password='Strong-test-password-456',
        )
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {'email': 'OWNER@EXAMPLE.COM'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)


class PublicUserProfileAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='public-author',
            email='private@example.com',
            first_name='Public',
            last_name='Author',
            password='Strong-test-password-123',
        )
        category = Category.objects.create(
            name='Development',
            slug='development',
        )
        tag = Tag.objects.create(name='Django', slug='django')
        cls.public_post = Post.objects.create(
            title='Public profile post',
            content='one two three',
            author=cls.user,
            category=category,
            status=Post.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        cls.public_post.tags.add(tag)
        PostBlock.objects.create(
            post=cls.public_post,
            content='<p>four five</p>',
        )
        Post.objects.create(
            title='Private profile draft',
            author=cls.user,
            status=Post.Status.DRAFT,
        )
        cls.url = reverse(
            'account:public-user-profile',
            args=(cls.user.username,),
        )

    def test_anonymous_visitor_receives_real_public_profile_statistics(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user.username)
        self.assertEqual(response.data['first_name'], 'Public')
        self.assertEqual(response.data['last_name'], 'Author')
        self.assertEqual(response.data['published_posts_count'], 1)
        self.assertEqual(response.data['total_reading_time'], 1)
        self.assertEqual(response.data['categories_count'], 1)
        self.assertEqual(response.data['tags_count'], 1)
        self.assertNotIn('email', response.data)

    def test_unknown_or_inactive_profile_returns_not_found(self):
        self.user.is_active = False
        self.user.save(update_fields=('is_active',))

        inactive_response = self.client.get(self.url)
        missing_response = self.client.get(
            reverse('account:public-user-profile', args=('missing-user',)),
        )

        self.assertEqual(
            inactive_response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            missing_response.status_code,
            status.HTTP_404_NOT_FOUND,
        )


class PasswordResetAPITests(APITestCase):
    new_password = 'New!SecurePassphrase-93'

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='reset-user',
            email='reset@example.com',
            password='Old!SecurePassphrase-47',
        )
        cls.csrf_url = reverse('account:csrf-token')
        cls.request_url = reverse('account:password-reset')
        cls.confirm_url = reverse('account:password-reset-confirm')

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def get_csrf_token(self):
        response = self.client.get(self.csrf_url)
        return response.cookies[settings.CSRF_COOKIE_NAME].value

    def test_reset_request_requires_csrf_and_does_not_reveal_accounts(self):
        without_csrf = self.client.post(
            self.request_url,
            {'email': self.user.email},
            format='json',
        )
        csrf_token = self.get_csrf_token()
        known_response = self.client.post(
            self.request_url,
            {'email': self.user.email},
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        unknown_response = self.client.post(
            self.request_url,
            {'email': 'missing@example.com'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(without_csrf.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(known_response.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown_response.status_code, status.HTTP_200_OK)
        self.assertEqual(known_response.data, unknown_response.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('/password-recovery/', mail.outbox[0].body)

    def test_valid_one_use_token_updates_password(self):
        csrf_token = self.get_csrf_token()
        payload = {
            'uid': urlsafe_base64_encode(force_bytes(self.user.pk)),
            'token': default_token_generator.make_token(self.user),
            'new_password': self.new_password,
            'new_password_confirm': self.new_password,
        }

        response = self.client.post(
            self.confirm_url,
            payload,
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        reused_response = self.client.post(
            self.confirm_url,
            payload,
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))
        self.assertEqual(
            reused_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('token', reused_response.data)

    def test_reset_confirmation_validates_password_and_matching_fields(self):
        csrf_token = self.get_csrf_token()
        base_payload = {
            'uid': urlsafe_base64_encode(force_bytes(self.user.pk)),
            'token': default_token_generator.make_token(self.user),
        }
        mismatch_response = self.client.post(
            self.confirm_url,
            {
                **base_payload,
                'new_password': self.new_password,
                'new_password_confirm': 'Different!Passphrase-93',
            },
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        weak_response = self.client.post(
            self.confirm_url,
            {
                **base_payload,
                'new_password': 'password',
                'new_password_confirm': 'password',
            },
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(
            mismatch_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('new_password_confirm', mismatch_response.data)
        self.assertEqual(
            weak_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn('new_password', weak_response.data)
