from django.urls import path

from .views import (
    AuthorPostDetailView,
    AuthorPostListView,
    AuthorPostSubmitView,
    PublicPostDetailView,
    PublicPostListView,
)

app_name = 'blog'

urlpatterns = [
    path('posts/', PublicPostListView.as_view(), name='public-post-list'),
    path(
        'posts/<str:slug>/',
        PublicPostDetailView.as_view(),
        name='public-post-detail',
    ),
    path('dashboard/posts/', AuthorPostListView.as_view(), name='author-post-list'),
    path(
        'dashboard/posts/<int:pk>/',
        AuthorPostDetailView.as_view(),
        name='author-post-detail',
    ),
    path(
        'dashboard/posts/<int:pk>/submit/',
        AuthorPostSubmitView.as_view(),
        name='author-post-submit',
    ),
]
