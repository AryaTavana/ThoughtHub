from django.db import migrations, models
from django.db.models import Count
from django.utils import timezone


def migrate_moderation_statuses(apps, schema_editor):
    Post = apps.get_model('Blog', 'Post')
    Comment = apps.get_model('Blog', 'Comment')

    Post.objects.filter(status='in_review').update(status='draft')
    Post.objects.filter(status='rejected').update(status='removed')
    Post.objects.filter(status='scheduled').update(
        status='published',
        published_at=timezone.now(),
    )
    Comment.objects.filter(status='pending').update(status='approved')
    Comment.objects.filter(status='rejected').update(status='removed')

    Post.objects.update(comments=0)
    approved_counts = (
        Comment.objects.filter(status='approved')
        .values('post_id')
        .annotate(total=Count('id'))
    )
    for approved_count in approved_counts:
        Post.objects.filter(pk=approved_count['post_id']).update(
            comments=approved_count['total'],
        )


def restore_legacy_statuses(apps, schema_editor):
    Post = apps.get_model('Blog', 'Post')
    Comment = apps.get_model('Blog', 'Comment')

    Post.objects.filter(status='removed').update(status='rejected')
    Comment.objects.filter(status='removed').update(status='rejected')


class Migration(migrations.Migration):
    dependencies = [
        ('Blog', '0006_comment'),
    ]

    operations = [
        migrations.RunPython(
            migrate_moderation_statuses,
            restore_legacy_statuses,
        ),
        migrations.AlterField(
            model_name='post',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('published', 'Published'),
                    ('removed', 'Removed'),
                    ('archived', 'Archived'),
                ],
                db_index=True,
                default='draft',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='post',
            name='review_feedback',
            field=models.TextField(
                blank=True,
                help_text='The moderator’s reason for removing this post.',
            ),
        ),
        migrations.AlterField(
            model_name='post',
            name='published_at',
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                help_text='The most recent time this post was published.',
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='comment',
            name='status',
            field=models.CharField(
                choices=[
                    ('approved', 'Approved'),
                    ('removed', 'Removed'),
                ],
                db_index=True,
                default='approved',
                max_length=20,
            ),
        ),
    ]
