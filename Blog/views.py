from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Post
from .serializers import (
    AuthorPostListSerializer,
    AuthorPostWriteSerializer,
    PublicPostDetailSerializer,
    PublicPostListSerializer,
)


# Create your views here.
class PublicPostListView(ListAPIView):
    serializer_class = PublicPostListSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        return (
            Post.objects.published()
            .select_related("author", "category")
            .prefetch_related("tags", "blocks")
        )


class PublicPostDetailView(RetrieveAPIView):
    serializer_class = PublicPostDetailSerializer
    permission_classes = (AllowAny,)
    lookup_field = 'slug'

    def get_queryset(self):
        return (
            Post.objects.published()
            .select_related('author', 'category')
            .prefetch_related('tags', 'blocks')
        )


class AuthorPostListView(ListCreateAPIView):
    serializer_class = AuthorPostListSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Post.objects.filter(author=self.request.user)
            .select_related('author', 'category')
            .prefetch_related('tags', 'blocks')
            .order_by('-updated_at')
        )

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AuthorPostWriteSerializer

        return AuthorPostListSerializer

    def perform_create(self, serializer):
        serializer.save(
            author=self.request.user,
            status=Post.Status.DRAFT,
        )


class AuthorPostDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = AuthorPostWriteSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Post.objects.filter(author=self.request.user)
            .select_related('author', 'category')
            .prefetch_related('tags', 'blocks')
        )

    def perform_update(self, serializer):
        post = serializer.instance

        if serializer.validated_data:
            post.apply_author_edit()

        serializer.save()
