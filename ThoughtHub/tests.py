from pathlib import Path
from tempfile import TemporaryDirectory

from django.conf import settings
from django.test import SimpleTestCase, override_settings


class DeploymentRoutingTests(SimpleTestCase):
    def test_health_check(self):
        response = self.client.get('/healthz/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})

    def test_unknown_api_route_does_not_fall_back_to_spa(self):
        response = self.client.get('/api/not-a-real-route/')

        self.assertEqual(response.status_code, 404)

    def test_frontend_route_uses_vite_build_when_present(self):
        if not settings.FRONTEND_INDEX.exists():
            self.skipTest('Vite production build is not present.')

        response = self.client.get('/login')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '<div id="root"></div>', html=True)

    def test_media_can_be_served_by_small_managed_hosts(self):
        with TemporaryDirectory() as media_root:
            Path(media_root, 'example.txt').write_text(
                'ThoughtHub media',
                encoding='utf-8',
            )
            with override_settings(
                DEBUG=False,
                SERVE_MEDIA=True,
                MEDIA_ROOT=Path(media_root),
            ):
                response = self.client.get('/media/example.txt')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(b''.join(response.streaming_content), b'ThoughtHub media')

    @override_settings(DEBUG=False, SERVE_MEDIA=False)
    def test_media_is_disabled_in_production_by_default(self):
        response = self.client.get('/media/example.txt')

        self.assertEqual(response.status_code, 404)
