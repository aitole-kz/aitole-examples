"""python3 -m unittest discover python"""
import json
import pathlib
import unittest

from aitole import verify_webhook

V = json.loads((pathlib.Path(__file__).parent.parent / "test" / "vector.json").read_text("utf-8"))


class VerifyWebhook(unittest.TestCase):
    def test_valid(self):
        self.assertTrue(verify_webhook(V["secret"], V["body"], str(V["timestamp"]), V["signature"], now=V["timestamp"]))

    def test_tampered_body(self):
        body = V["body"].replace("4990", "1")
        self.assertFalse(verify_webhook(V["secret"], body, str(V["timestamp"]), V["signature"], now=V["timestamp"]))

    def test_wrong_secret(self):
        self.assertFalse(verify_webhook("other", V["body"], str(V["timestamp"]), V["signature"], now=V["timestamp"]))

    def test_stale(self):
        self.assertFalse(verify_webhook(V["secret"], V["body"], str(V["timestamp"]), V["signature"], now=V["timestamp"] + 301))


if __name__ == "__main__":
    unittest.main()
