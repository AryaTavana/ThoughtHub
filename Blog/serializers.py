from rest_framework import serializers

from .models import Category, Post, PostBlock, Tag


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = (
            'id',
            'name',
            'slug',
        )
        read_only_fields = fields


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = (
            'id',
            'name',
            'slug',
        )
        read_only_fields = fields


class PostBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostBlock
        fields = (
            'id',
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


class AuthorPostBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostBlock
        fields = (
            'id',
            'block_type',
            'position',
            'content',
            'image',
            'image_alt',
            'caption',
            'image_width',
            'video_url',
            'quote_attribution',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'created_at',
            'updated_at',
        )

    def validate(self, attrs):
        block_type = attrs.get(
            'block_type',
            (
                self.instance.block_type
                if self.instance
                else PostBlock.BlockType.RICH_TEXT
            ),
        )
        content = attrs.get(
            'content',
            self.instance.content if self.instance else '',
        )
        image = attrs.get(
            'image',
            self.instance.image if self.instance else None,
        )
        image_alt = attrs.get(
            'image_alt',
            self.instance.image_alt if self.instance else '',
        )
        video_url = attrs.get(
            'video_url',
            self.instance.video_url if self.instance else '',
        )

        errors = {}

        if (
            block_type
            in {
                PostBlock.BlockType.RICH_TEXT,
                PostBlock.BlockType.QUOTE,
            }
            and not content.strip()
        ):
            errors['content'] = 'Add content for this block type.'

        if block_type == PostBlock.BlockType.IMAGE:
            if not image:
                errors['image'] = 'Choose an image for this block.'
            if not image_alt.strip():
                errors['image_alt'] = (
                    'Describe the image for accessibility.'
                )

        if block_type == PostBlock.BlockType.VIDEO and not video_url:
            errors['video_url'] = 'Add a URL for this video block.'

        if errors:
            raise serializers.ValidationError(errors)

        return attrs


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
