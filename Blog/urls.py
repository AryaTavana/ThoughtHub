from django.urls import path

from .views import PublicPostListView, PublicPostDetailView, AuthorPostListView

app_name = 'blog'

urlpatterns = [
    path('posts/', PublicPostListView.as_view(), name='public-post-list'),
    path('posts/<str:slug>/', PublicPostDetailView.as_view(), name='public-post-detail'),
    path('dashboard/posts/', AuthorPostListView.as_view(), name='author-post-list'),
]
