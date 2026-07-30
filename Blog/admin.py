from django import forms
from django.contrib import admin
from django.db.models import Count
from django.utils import timezone

from unfold.admin import ModelAdmin, StackedInline
from unfold.contrib.forms.widgets import WysiwygWidget

from .models import Category, Comment, Post, PostBlock, Tag


def _sync_post_comment_counts(post_ids):
    post_ids = {post_id for post_id in post_ids if post_id is not None}
    if not post_ids:
        return

    approved_counts = dict(
        Comment.objects.filter(
            post_id__in=post_ids,
            status=Comment.Status.APPROVED,
        )
        .values('post_id')
        .annotate(total=Count('id'))
        .values_list('post_id', 'total')
    )

    for post_id in post_ids:
        Post.objects.filter(pk=post_id).update(
            comments=approved_counts.get(post_id, 0),
        )


class PostAdminForm(forms.ModelForm):
    def clean(self):
        cleaned_data = super().clean()

        if cleaned_data.get('status') in {
            Post.Status.PUBLISHED,
            Post.Status.SCHEDULED,
        }:
            cleaned_data['review_feedback'] = ''

        return cleaned_data

    class Meta:
        model = Post
        fields = '__all__'
        widgets = {
            'content': WysiwygWidget,
        }


class PostBlockAdminForm(forms.ModelForm):
    class Meta:
        model = PostBlock
        fields = '__all__'
        widgets = {
            'content': WysiwygWidget,
        }


class PostBlockInline(StackedInline):
    model = PostBlock
    form = PostBlockAdminForm
    extra = 0
    ordering = ('position',)
    fields = (
        'position',
        'block_type',
        'content',
        'image',
        'image_alt',
        'caption',
        'image_width',
        'video_url',
        'quote_attribution',
    )
    verbose_name = 'Content block'
    verbose_name_plural = 'Ordered content blocks'


@admin.register(Post)
class PostAdmin(ModelAdmin):
    form = PostAdminForm
    inlines = (PostBlockInline,)
    list_display = (
        'title',
        'author',
        'category',
        'status',
        'post_type',
        'is_featured',
        'published_at',
    )
    list_filter = (
        'status',
        'post_type',
        'is_featured',
        'allow_comments',
        'category',
        'tags',
    )
    search_fields = (
        'title',
        'excerpt',
        'content',
        'author__username',
    )
    readonly_fields = (
        'date_posted',
        'updated_at',
        'views',
        'likes',
        'comments',
    )
    prepopulated_fields = {'slug': ('title',)}
    filter_horizontal = ('tags',)
    date_hierarchy = 'published_at'
    list_select_related = ('author', 'category')
    fieldsets = (
        (
            'Content',
            {
                'fields': (
                    'title',
                    'slug',
                    'excerpt',
                    'content',
                    'featured_image',
                    'featured_image_alt',
                ),
            },
        ),
        (
            'Organization',
            {
                'fields': ('author', 'category', 'tags', 'post_type'),
            },
        ),
        (
            'Publishing',
            {
                'fields': (
                    'status',
                    'review_feedback',
                    'published_at',
                    'is_featured',
                    'allow_comments',
                ),
            },
        ),
        (
            'SEO',
            {
                'classes': ('collapse',),
                'fields': ('meta_title', 'meta_description'),
            },
        ),
        (
            'Statistics',
            {
                'classes': ('collapse',),
                'fields': (
                    'views',
                    'likes',
                    'comments',
                    'date_posted',
                    'updated_at',
                ),
            },
        ),
    )


@admin.register(PostBlock)
class PostBlockAdmin(ModelAdmin):
    form = PostBlockAdminForm
    list_display = ('post', 'position', 'block_type', 'updated_at')
    list_filter = ('block_type', 'image_width')
    list_select_related = ('post',)
    search_fields = ('post__title', 'content', 'caption')
    ordering = ('post', 'position')


@admin.register(Comment)
class CommentAdmin(ModelAdmin):
    list_display = (
        'content_preview',
        'author',
        'post',
        'status',
        'created_at',
    )
    list_filter = ('status', 'created_at')
    search_fields = (
        'content',
        'author__username',
        'author__email',
        'post__title',
    )
    readonly_fields = ('created_at', 'updated_at')
    list_select_related = ('author', 'post')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    actions = (
        'approve_selected_comments',
        'reject_selected_comments',
    )
    fieldsets = (
        (
            'Comment',
            {
                'fields': (
                    'post',
                    'author',
                    'content',
                ),
            },
        ),
        (
            'Moderation',
            {
                'fields': (
                    'status',
                    'moderation_feedback',
                ),
            },
        ),
        (
            'Timestamps',
            {
                'classes': ('collapse',),
                'fields': (
                    'created_at',
                    'updated_at',
                ),
            },
        ),
    )

    @admin.display(description='Comment')
    def content_preview(self, obj):
        if len(obj.content) <= 80:
            return obj.content

        return f'{obj.content[:77]}...'

    @admin.action(description='Approve selected comments')
    def approve_selected_comments(self, request, queryset):
        post_ids = set(queryset.values_list('post_id', flat=True))
        updated_count = queryset.update(
            status=Comment.Status.APPROVED,
            moderation_feedback='',
            updated_at=timezone.now(),
        )
        _sync_post_comment_counts(post_ids)
        self.message_user(
            request,
            f'{updated_count} comment(s) approved.',
        )

    @admin.action(description='Reject selected comments')
    def reject_selected_comments(self, request, queryset):
        post_ids = set(queryset.values_list('post_id', flat=True))
        updated_count = queryset.update(
            status=Comment.Status.REJECTED,
            updated_at=timezone.now(),
        )
        _sync_post_comment_counts(post_ids)
        self.message_user(
            request,
            f'{updated_count} comment(s) rejected.',
        )

    def save_model(self, request, obj, form, change):
        old_post_id = None
        if obj.pk:
            old_post_id = (
                Comment.objects.filter(pk=obj.pk)
                .values_list('post_id', flat=True)
                .first()
            )

        super().save_model(request, obj, form, change)
        _sync_post_comment_counts({old_post_id, obj.post_id})

    def delete_model(self, request, obj):
        post_id = obj.post_id

        super().delete_model(request, obj)
        _sync_post_comment_counts({post_id})

    def delete_queryset(self, request, queryset):
        post_ids = set(queryset.values_list('post_id', flat=True))

        super().delete_queryset(request, queryset)
        _sync_post_comment_counts(post_ids)


@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Tag)
class TagAdmin(ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
