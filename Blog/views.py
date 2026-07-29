from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.exceptions import ValidationError as APIValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Post, Tag
from .serializers import (
    AuthorPostListSerializer,
    AuthorPostWriteSerializer,
    CategorySerializer,
    PublicPostDetailSerializer,
    PublicPostListSerializer,
    TagSerializer,
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


class CategoryListView(ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = (AllowAny,)
    pagination_class = None


class TagListView(ListAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = (AllowAny,)
    pagination_class = None


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


class AuthorPostSubmitView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        queryset = (
            Post.objects.filter(author=request.user)
            .select_related('author', 'category')
            .prefetch_related('tags', 'blocks')
        )
        post = get_object_or_404(queryset, pk=pk)

        try:
            post.submit_for_review()
            post.full_clean()
        except DjangoValidationError as error:
            details = (
                error.message_dict
                if hasattr(error, 'message_dict')
                else error.messages
            )
            raise APIValidationError(details) from error

        post.save(
            update_fields=(
                'status',
                'review_feedback',
                'updated_at',
            ),
        )
        serializer = AuthorPostWriteSerializer(
            post,
            context={'request': request},
        )
        return Response(serializer.data)
