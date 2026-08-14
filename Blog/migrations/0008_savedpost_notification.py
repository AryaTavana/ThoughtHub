from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('Blog', '0007_immediate_publishing_and_moderation'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SavedPost',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('saved_at', models.DateTimeField(auto_now_add=True)),
                (
                    'post',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='saved_by',
                        to='Blog.post',
                    ),
                ),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='saved_posts',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ('-saved_at', '-pk'),
                'indexes': [
                    models.Index(
                        fields=['user', 'saved_at'],
                        name='blog_saved_user_time_idx',
                    ),
                ],
                'constraints': [
                    models.UniqueConstraint(
                        fields=('user', 'post'),
                        name='blog_unique_saved_post',
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'kind',
                    models.CharField(
                        choices=[
                            ('new_comment', 'New comment'),
                            ('post_removed', 'Post removed'),
                            ('comment_removed', 'Comment removed'),
                        ],
                        max_length=30,
                    ),
                ),
                ('title', models.CharField(max_length=200)),
                ('message', models.CharField(max_length=500)),
                ('is_read', models.BooleanField(db_index=True, default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'actor',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='notification_actions',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'comment',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='notifications',
                        to='Blog.comment',
                    ),
                ),
                (
                    'post',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='notifications',
                        to='Blog.post',
                    ),
                ),
                (
                    'recipient',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='notifications',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ('-created_at', '-pk'),
                'indexes': [
                    models.Index(
                        fields=['recipient', 'is_read', 'created_at'],
                        name='blog_notice_user_read_idx',
                    ),
                ],
            },
        ),
    ]
