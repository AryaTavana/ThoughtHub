from django import forms
from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group, User

from unfold.admin import ModelAdmin, StackedInline
from unfold.contrib.forms.widgets import WysiwygWidget
from unfold.forms import (
    AdminPasswordChangeForm,
    UserChangeForm,
    UserCreationForm,
)

from .models import Category, Post, PostBlock, Tag


admin.site.unregister((User, Group))


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass


class PostAdminForm(forms.ModelForm):
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
