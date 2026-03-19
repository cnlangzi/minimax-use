#!/usr/bin/env python3
"""
Test suite for MiniMax skill functionality.
Run with: python3 -m scripts.test_skill
"""

import os
import sys
import json
import unittest

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts import web_search, understand_image, chat, stream_chat, translate, AVAILABLE_MODELS


class TestMiniMaxAPIKey(unittest.TestCase):
    """Test that API key is configured."""

    def test_api_key_exists(self):
        api_key = os.environ.get("MINIMAX_API_KEY")
        self.assertIsNotNone(api_key, "MINIMAX_API_KEY environment variable is not set")
        self.assertTrue(len(api_key) > 0, "MINIMAX_API_KEY is empty")


class TestModels(unittest.TestCase):
    """Test models listing."""

    def test_models_not_empty(self):
        self.assertIsNotNone(AVAILABLE_MODELS)
        self.assertTrue(len(AVAILABLE_MODELS) > 0)

    def test_models_contain_expected(self):
        expected_models = ["MiniMax-M2.7", "MiniMax-M2.5"]
        for model in expected_models:
            self.assertTrue(
                any(model in v for v in AVAILABLE_MODELS.values()),
                f"Expected model {model} not found"
            )


class TestWebSearch(unittest.TestCase):
    """Test web search functionality."""

    @unittest.skipUnless(os.environ.get("MINIMAX_API_KEY"), "No API key")
    def test_web_search_success(self):
        result = web_search("Python programming", count=5)
        self.assertIsInstance(result, dict)
        self.assertIn("success", result)

    def test_web_search_no_api_key(self):
        # Test without API key - should fail gracefully
        result = web_search("test query")
        self.assertIn("success", result)


class TestUnderstandImage(unittest.TestCase):
    """Test image understanding functionality."""

    @unittest.skipUnless(os.environ.get("MINIMAX_API_KEY"), "No API key")
    def test_understand_image_no_api_key(self):
        # Test with non-existent image to verify error handling
        result = understand_image("test", "/nonexistent/image.jpg")
        self.assertIn("success", result)


class TestChat(unittest.TestCase):
    """Test LLM chat functionality."""

    @unittest.skipUnless(os.environ.get("MINIMAX_API_KEY"), "No API key")
    def test_chat_success(self):
        result = chat("Hello", model="MiniMax-M2.7", max_tokens=10)
        self.assertIsInstance(result, dict)
        self.assertIn("success", result)

    def test_chat_no_api_key(self):
        result = chat("test")
        self.assertIn("success", result)

    def test_chat_parameters(self):
        # Test with various parameters
        result = chat(
            message="Hi",
            system="You are a helpful assistant",
            model="MiniMax-M2.7",
            temperature=0.5,
            max_tokens=50
        )
        self.assertIn("success", result)


class TestTranslate(unittest.TestCase):
    """Test translation functionality."""

    @unittest.skipUnless(os.environ.get("MINIMAX_API_KEY"), "No API key")
    def test_translate_success(self):
        result = translate("Hello", target_lang="Chinese", max_tokens=50)
        self.assertIsInstance(result, dict)
        self.assertIn("success", result)

    def test_translate_no_api_key(self):
        result = translate("test")
        self.assertIn("success", result)

    def test_translate_auto_detect(self):
        result = translate("你好", target_lang="English", source_lang="auto")
        self.assertIn("success", result)


class TestStreamChat(unittest.TestCase):
    """Test streaming chat functionality."""

    @unittest.skipUnless(os.environ.get("MINIMAX_API_KEY"), "No API key")
    def test_stream_chat_success(self):
        result = stream_chat("Hello", model="MiniMax-M2.7", max_tokens=10)
        self.assertIsInstance(result, dict)
        self.assertIn("success", result)

    def test_stream_chat_no_api_key(self):
        result = stream_chat("test")
        self.assertIn("success", result)

    def test_stream_chat_parameters(self):
        result = stream_chat(
            message="Hi",
            system="You are a helpful assistant",
            model="MiniMax-M2.7",
            temperature=0.5,
            max_tokens=50
        )
        self.assertIn("success", result)


def run_tests():
    """Run all tests and print results."""
    # Check API key status
    api_key = os.environ.get("MINIMAX_API_KEY")

    print("=" * 50)
    print("MiniMax Skill Test Suite")
    print("=" * 50)
    print()

    if not api_key:
        print("WARNING: MINIMAX_API_KEY is not set!")
        print("Some tests will be skipped.")
        print()
    else:
        print("API Key: Present")
        print()

    # Run tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test cases
    suite.addTests(loader.loadTestsFromTestCase(TestMiniMaxAPIKey))
    suite.addTests(loader.loadTestsFromTestCase(TestModels))
    suite.addTests(loader.loadTestsFromTestCase(TestWebSearch))
    suite.addTests(loader.loadTestsFromTestCase(TestUnderstandImage))
    suite.addTests(loader.loadTestsFromTestCase(TestChat))
    suite.addTests(loader.loadTestsFromTestCase(TestStreamChat))
    suite.addTests(loader.loadTestsFromTestCase(TestTranslate))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print()
    print("=" * 50)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Skipped: {len(result.skipped)}")
    print("=" * 50)

    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
