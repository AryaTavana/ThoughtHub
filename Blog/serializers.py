from rest_framework import serializers

from .models import Category, Post, PostBlock, Tag


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = (
            'name',
            'slug',
        )
        read_only_fields = fields


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = (
            'name',
            'slug',
        )
        read_only_fields = fields


class PostBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostBlock
        fields = (
            'block_type',
            'position',
            'content',
            'image',
            'image_alt',
            'caption',
            'image_width',
            'video_url',
            'quote_attribution',
        )
        read_only_fields = fields


class PublicPostListSerializer(serializers.ModelSerializer):
    reading_time = serializers.IntegerField(read_only=True)
    author_username = serializers.CharField(
        source='author.username',
        read_only=True,
        default=None,
    )
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = (
            'id',
            'title',
            'slug',
            'excerpt',
            'author_username',
            'category',
            'tags',
            'featured_image',
            'featured_image_alt',
            'post_type',
            'published_at',
            'reading_time',
        )
        read_only_fields = fields


class PublicPostDetailSerializer(PublicPostListSerializer):
    blocks = PostBlockSerializer(many=True, read_only=True)

    class Meta(PublicPostListSerializer.Meta):
        fields = PublicPostListSerializer.Meta.fields + (
            'content',
            'blocks',
            'allow_comments',
            'meta_title',
            'meta_description',
            'updated_at',
        )
        read_only_fields = fields


class AuthorPostListSerializer(PublicPostListSerializer):
    class Meta(PublicPostListSerializer.Meta):
        fields = PublicPostListSerializer.Meta.fields + (
            'status',
            'review_feedback',
            'date_posted',
            'updated_at',
        )
        read_only_fields = fields


class AuthorPostWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = (
            'id',
            'title',
            'slug',
            'excerpt',
            'content',
            'category',
            'tags',
            'featured_image',
            'featured_image_alt',
            'post_type',
            'allow_comments',
            'meta_title',
            'meta_description',
            'status',
            'review_feedback',
            'published_at',
            'date_posted',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'slug',
            'status',
            'review_feedback',
            'published_at',
            'date_posted',
            'updated_at',
        )

    def validate(self, attrs):
        featured_image = attrs.get(
            'featured_image',
            self.instance.featured_image if self.instance else None,
        )
        featured_image_alt = attrs.get(
            'featured_image_alt',
            self.instance.featured_image_alt if self.instance else '',
        )

        if featured_image and not featured_image_alt.strip():
            raise serializers.ValidationError({
                'featured_image_alt': (
                    'Add alternative text when a featured image is used.'
                ),
            })

        return attrs
