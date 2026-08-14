from django.contrib.auth import (
    get_user_model,
    login as django_login,
    logout as django_logout,
)
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    CurrentUserSerializer,
    CurrentUserUpdateSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PublicUserProfileSerializer,
    RegistrationSerializer,
)

User = get_user_model()


# Create your views here.
@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFTokenView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request):
        return Response({
            'detail': 'CSRF cookie set.',
        })


@method_decorator(csrf_protect, name='dispatch')
class RegistrationView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        django_login(request, user)

        return Response(
            CurrentUserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_protect, name='dispatch')
class LoginView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        django_login(request, user)

        return Response(CurrentUserSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        django_logout(request)

        return Response({
            'detail': 'Logged out.',
        })


class CurrentUserView(RetrieveUpdateAPIView):
    def get_serializer_class(self):
        if self.request.method in {'PUT', 'PATCH'}:
            return CurrentUserUpdateSerializer

        return CurrentUserSerializer

    def get_object(self):
        return self.request.user


class PublicUserProfileView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, username):
        user = get_object_or_404(
            User.objects.filter(is_active=True),
            username=username,
        )
        published_posts = list(
            user.posts.published()
            .select_related('category')
            .prefetch_related('tags', 'blocks')
        )
        user.published_posts_count = len(published_posts)
        user.total_reading_time = sum(
            post.reading_time for post in published_posts
        )
        user.topics_count = len({
            topic
            for post in published_posts
            for topic in (
                *((f'category:{post.category.slug}',) if post.category else ()),
                f'type:{post.post_type}',
                *(f'tag:{tag.slug}' for tag in post.tags.all()),
            )
        })

        return Response(PublicUserProfileSerializer(user).data)


@method_decorator(csrf_protect, name='dispatch')
class PasswordResetRequestView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data['email'],
            is_active=True,
        ).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}"
                f'/password-recovery/{uid}/{token}'
            )
            send_mail(
                'Reset your ThoughtHub password',
                (
                    'A password reset was requested for your ThoughtHub account.\n\n'
                    f'Open this one-use link to choose a new password:\n{reset_url}\n\n'
                    'If you did not request this, you can ignore this message.'
                ),
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
            )

        return Response({
            'detail': (
                'If an active account uses that email address, a password '
                'reset link has been sent.'
            ),
        })


@method_decorator(csrf_protect, name='dispatch')
class PasswordResetConfirmView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=('password',))

        return Response({'detail': 'Your password has been updated.'})
