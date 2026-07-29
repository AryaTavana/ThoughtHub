from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny

from .models import Post
from .serializers import PublicPostListSerializer, PublicPostDetailSerializer


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
