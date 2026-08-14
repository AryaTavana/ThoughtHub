from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Comment, Notification, Post


def _remember_previous_status(instance, model):
    if not instance.pk:
        instance._previous_status = None
        return

    instance._previous_status = (
        model.objects.filter(pk=instance.pk)
        .values_list('status', flat=True)
        .first()
    )


def _short_message(value, fallback):
    message = (value or '').strip() or fallback
    return message[:500]


@receiver(pre_save, sender=Post)
def remember_post_status(sender, instance, **kwargs):
    _remember_previous_status(instance, sender)


@receiver(pre_save, sender=Comment)
def remember_comment_status(sender, instance, **kwargs):
    _remember_previous_status(instance, sender)


@receiver(post_save, sender=Post)
def notify_removed_post(sender, instance, raw=False, **kwargs):
    if raw or not instance.author_id:
        return

    if (
        instance.status == Post.Status.REMOVED
        and getattr(instance, '_previous_status', None)
        != Post.Status.REMOVED
    ):
        Notification.objects.create(
            recipient_id=instance.author_id,
            post=instance,
            kind=Notification.Kind.POST_REMOVED,
            title=f'Your post “{instance.title}” was removed',
            message=_short_message(
                instance.review_feedback,
                'Open your dashboard to review the moderation feedback.',
            ),
        )


@receiver(post_save, sender=Comment)
def notify_comment_activity(sender, instance, created, raw=False, **kwargs):
    if raw:
        return

    if (
        created
        and instance.status == Comment.Status.APPROVED
        and instance.post.author_id
        and instance.post.author_id != instance.author_id
    ):
        actor_name = (
            instance.author.username
            if instance.author_id
            else 'A reader'
        )
        Notification.objects.create(
            recipient_id=instance.post.author_id,
            actor_id=instance.author_id,
            post=instance.post,
            comment=instance,
            kind=Notification.Kind.NEW_COMMENT,
            title=f'{actor_name} commented on “{instance.post.title}”',
            message=_short_message(
                instance.content,
                'A reader joined the discussion.',
            ),
        )

    if (
        instance.author_id
        and instance.status == Comment.Status.REMOVED
        and getattr(instance, '_previous_status', None)
        != Comment.Status.REMOVED
    ):
        Notification.objects.create(
            recipient_id=instance.author_id,
            post=instance.post,
            comment=instance,
            kind=Notification.Kind.COMMENT_REMOVED,
            title=f'Your comment on “{instance.post.title}” was removed',
            message=_short_message(
                instance.moderation_feedback,
                'Open your dashboard to review the moderation feedback.',
            ),
        )
