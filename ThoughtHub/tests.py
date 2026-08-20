from django.conf import settings
from django.test import SimpleTestCase


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
