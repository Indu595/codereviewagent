import json
import os
import unittest
from unittest.mock import patch

import app


class ReviewAppTests(unittest.TestCase):
    def setUp(self):
        app.app.config.update(TESTING=True)
        self.client = app.app.test_client()

    def test_home_page_loads(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Review code", response.data)

    def test_rejects_non_object_json(self):
        response = self.client.post("/api/review", json=["not", "an", "object"])

        self.assertEqual(response.status_code, 400)

    def test_rejects_empty_code(self):
        response = self.client.post("/api/review", json={"code": "  "})

        self.assertEqual(response.status_code, 400)

    def test_rejects_code_over_limit(self):
        response = self.client.post("/api/review", json={"code": "x" * (app.MAX_CODE_LENGTH + 1)})

        self.assertEqual(response.status_code, 413)

    def test_requires_api_key(self):
        with patch.dict(os.environ, {}, clear=True):
            response = self.client.post("/api/review", json={"code": "print('hello')"})

        self.assertEqual(response.status_code, 503)
        self.assertIn("GEMINI_API_KEY", response.get_json()["error"])

    def test_returns_mocked_review(self):
        expected = {
            "summary": "One possible issue.",
            "findings": [{"severity": "high", "title": "Unsafe input", "line": 2}],
        }
        mock_client = unittest.mock.Mock()
        mock_client.models.generate_content.return_value = unittest.mock.Mock(text=json.dumps(expected))

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}, clear=True):
            with patch("app.genai.Client", return_value=mock_client):
                response = self.client.post("/api/review", json={"code": "value = input()", "language": "Python"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), expected)
        mock_client.models.generate_content.assert_called_once()


if __name__ == "__main__":
    unittest.main()