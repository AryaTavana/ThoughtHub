from django.urls import path

from .views import (
    AuthorCommentListView,
    AuthorPostBlockDetailView,
    AuthorPostBlockListCreateView,
    AuthorPostBlockReorderView,
    AuthorPostDetailView,
    AuthorPostListView,
    AuthorPostPublishView,
    CategoryListView,
    PublicPostCommentListCreateView,
    PublicPostDetailView,
    PublicPostListView,
    TagListView,
)

app_name = 'blog'

urlpatterns = [
    path('posts/', PublicPostListView.as_view(), name='public-post-list'),
    path(
        'posts/<str:slug>/comments/',
        PublicPostCommentListCreateView.as_view(),
        name='public-post-comment-list',
    ),
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
        'dashboard/comments/',
        AuthorCommentListView.as_view(),
        name='author-comment-list',
    ),
    path(
        'dashboard/posts/<int:pk>/',
        AuthorPostDetailView.as_view(),
        name='author-post-detail',
    ),
    path(
        'dashboard/posts/<int:pk>/publish/',
        AuthorPostPublishView.as_view(),
        name='author-post-publish',
    ),
    path(
        'dashboard/posts/<int:post_pk>/blocks/',
        AuthorPostBlockListCreateView.as_view(),
        name='author-post-block-list',
    ),
    path(
        'dashboard/posts/<int:post_pk>/blocks/reorder/',
        AuthorPostBlockReorderView.as_view(),
        name='author-post-block-reorder',
    ),
    path(
        'dashboard/posts/<int:post_pk>/blocks/<int:pk>/',
        AuthorPostBlockDetailView.as_view(),
        name='author-post-block-detail',
    ),
]
