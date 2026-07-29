from django.urls import path

from .views import (
    AuthorPostDetailView,
    AuthorPostListView,
    AuthorPostSubmitView,
    CategoryListView,
    PublicPostDetailView,
    PublicPostListView,
    TagListView,
)

app_name = 'blog'

urlpatterns = [
    path('posts/', PublicPostListView.as_view(), name='public-post-list'),
    path(
        'posts/<str:slug>/',
        PublicPostDetailView.as_view(),
        name='public-post-detail',
    ),
    path(
        'categories/',
        CategoryListView.as_view(),
        name='category-list',
    ),
    path(
        'tags/',
        TagListView.as_view(),
        name='tag-list',
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
