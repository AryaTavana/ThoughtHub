from django.contrib.auth import (
    login as django_login,
    logout as django_logout,
)
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    CurrentUserSerializer,
    LoginSerializer,
    RegistrationSerializer,
)


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


class CurrentUserView(RetrieveAPIView):
    serializer_class = CurrentUserSerializer

    def get_object(self):
        return self.request.user
