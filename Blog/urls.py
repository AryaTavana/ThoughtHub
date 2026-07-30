from django.urls import path

from .views import (
    AuthorPostBlockDetailView,
    AuthorPostBlockListCreateView,
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
    path(
        'dashboard/posts/<int:post_pk>/blocks/',
        AuthorPostBlockListCreateView.as_view(),
        name='author-post-block-list',
    ),
    path(
        'dashboard/posts/<int:post_pk>/blocks/<int:pk>/',
        AuthorPostBlockDetailView.as_view(),
        name='author-post-block-detail',
    ),
]
