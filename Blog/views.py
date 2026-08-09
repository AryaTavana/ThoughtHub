from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.exceptions import (
    PermissionDenied,
    ValidationError as APIValidationError,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Comment, Post, PostBlock, Tag
from .serializers import (
    AuthorCommentSerializer,
    AuthorPostBlockSerializer,
    AuthorPostListSerializer,
    AuthorPostWriteSerializer,
    CategorySerializer,
    CommentCreateSerializer,
    PublicCommentSerializer,
    PublicPostDetailSerializer,
    PublicPostListSerializer,
    TagSerializer,
)


def _mark_post_as_edited(post):
    post.apply_author_edit()
    post.save(update_fields=('status', 'updated_at'))


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


class PublicPostCommentListCreateView(ListCreateAPIView):
    permission_classes = (AllowAny,)

    def get_post(self):
        if not hasattr(self, '_post'):
            self._post = get_object_or_404(
                Post.objects.published(),
                slug=self.kwargs['slug'],
            )

        return self._post

    def get_queryset(self):
        return (
            Comment.objects.filter(
                post=self.get_post(),
                status=Comment.Status.APPROVED,
            )
            .select_related('author')
        )

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CommentCreateSerializer

        return PublicCommentSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return (IsAuthenticated(),)

        return (AllowAny(),)

    def perform_create(self, serializer):
        post = self.get_post()

        if not post.allow_comments:
            raise PermissionDenied(
                'Comments are closed for this post.',
            )

        with transaction.atomic():
            serializer.save(
                post=post,
                author=self.request.user,
                status=Comment.Status.APPROVED,
            )
            Post.objects.filter(pk=post.pk).update(
                comments=F('comments') + 1,
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


class AuthorCommentListView(ListAPIView):
    serializer_class = AuthorCommentSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Comment.objects.filter(author=self.request.user)
            .select_related('post')
            .order_by('-created_at')
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


class AuthorPostBlockListCreateView(ListCreateAPIView):
    serializer_class = AuthorPostBlockSerializer
    permission_classes = (IsAuthenticated,)
    pagination_class = None

    def get_post(self):
        if not hasattr(self, '_post'):
            self._post = get_object_or_404(
                Post,
                pk=self.kwargs['post_pk'],
                author=self.request.user,
            )

        return self._post

    def get_queryset(self):
        return (
            PostBlock.objects.filter(post=self.get_post())
            .select_related('post')
        )

    def perform_create(self, serializer):
        post = self.get_post()

        with transaction.atomic():
            serializer.save(post=post)
            _mark_post_as_edited(post)


class AuthorPostBlockDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = AuthorPostBlockSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            PostBlock.objects.filter(
                post_id=self.kwargs['post_pk'],
                post__author=self.request.user,
            )
            .select_related('post')
        )

    def perform_update(self, serializer):
        has_changes = bool(serializer.validated_data)

        with transaction.atomic():
            block = serializer.save()

            if has_changes:
                _mark_post_as_edited(block.post)

    def perform_destroy(self, instance):
        post = instance.post

        with transaction.atomic():
            instance.delete()
            _mark_post_as_edited(post)


class AuthorPostBlockReorderView(APIView):
    permission_classes = (IsAuthenticated,)

    def put(self, request, post_pk):
        block_ids = request.data.get('block_ids')

        if (
            not isinstance(block_ids, list)
            or any(
                not isinstance(block_id, int)
                or isinstance(block_id, bool)
                for block_id in block_ids
            )
        ):
            raise APIValidationError({
                'block_ids': 'Provide an ordered list of block IDs.',
            })

        with transaction.atomic():
            post = get_object_or_404(
                Post.objects.select_for_update(),
                pk=post_pk,
                author=request.user,
            )
            blocks = list(
                PostBlock.objects.select_for_update().filter(post=post)
            )
            blocks_by_id = {block.pk: block for block in blocks}

            if (
                len(block_ids) != len(blocks_by_id)
                or set(block_ids) != set(blocks_by_id)
            ):
                raise APIValidationError({
                    'block_ids': (
                        'Provide every block for this post exactly once.'
                    ),
                })

            updated_at = timezone.now()
            ordered_blocks = []
            has_changes = False

            for position, block_id in enumerate(block_ids):
                block = blocks_by_id[block_id]
                if block.position != position:
                    has_changes = True
                block.position = position
                block.updated_at = updated_at
                ordered_blocks.append(block)

            if has_changes:
                PostBlock.objects.bulk_update(
                    ordered_blocks,
                    ('position', 'updated_at'),
                )
                _mark_post_as_edited(post)

        serializer = AuthorPostBlockSerializer(
            ordered_blocks,
            many=True,
            context={'request': request},
        )
        return Response(serializer.data)


class AuthorPostPublishView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        queryset = (
            Post.objects.filter(author=request.user)
            .select_related('author', 'category')
            .prefetch_related('tags', 'blocks')
        )
        post = get_object_or_404(queryset, pk=pk)

        try:
            post.publish()
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
                'published_at',
                'updated_at',
            ),
        )
        serializer = AuthorPostWriteSerializer(
            post,
            context={'request': request},
        )
        return Response(serializer.data)
