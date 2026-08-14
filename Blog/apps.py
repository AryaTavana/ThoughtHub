from django.apps import AppConfig


class BlogConfig(AppConfig):
    name = 'Blog'

    def ready(self):
        from . import signals  # noqa: F401
