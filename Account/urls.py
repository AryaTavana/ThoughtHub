from django.urls import path

from .views import (
    CSRFTokenView,
    CurrentUserView,
    LoginView,
    LogoutView,
    RegistrationView,
)

app_name = 'account'

urlpatterns = [
    path('csrf/', CSRFTokenView.as_view(), name='csrf-token'),
    path(
        'register/',
        RegistrationView.as_view(),
        name='register',
    ),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
]
