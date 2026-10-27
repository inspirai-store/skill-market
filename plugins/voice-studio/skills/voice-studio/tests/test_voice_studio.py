"""Offline acceptance: isolated user data, synthetic audio, no provider requests."""
from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest import mock
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

SKILL = Path(__file__).resolve().parents[1]
IMPORT_DATA = tempfile.TemporaryDirectory(prefix="voice-studio-import-test-")
os.environ["VOICE_STUDIO_DATA"] = IMPORT_DATA.name
sys.path.insert(0, str(SKILL / "scripts"))
import tts
import server
import voice_studio


def tearDownModule():
    IMPORT_DATA.cleanup()


class OfflineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="voice-studio-offline-test-")
        self.root = Path(self.temp.name).resolve()
        tts.ROOT = server.ROOT = self.root
        server.LIBRARY, server.CACHE, server.PRESET = self.root / "library", self.root / "cache", self.root / "preset.json"
        tts.KEYS = {}
        self.library = server.VoiceLibrary()
        class FixtureHandler(server.Handler):
            pass
        FixtureHandler.library = self.library
        self.http = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
        self.port = self.http.server_address[1]
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.voice = next(v for v in self.library.voices if v["provider"] == "bailian")

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join(timeout=3)
        self.library.pool.shutdown(wait=True)
        self.temp.cleanup()

    def api(self, path, body=None):
        return voice_studio.api(self.port, path, body)

    def cli(self, *arguments):
        env = os.environ.copy()
        env["VOICE_STUDIO_DATA"] = str(self.root)
        return subprocess.run([sys.executable, str(SKILL / "scripts/voice_studio.py"), "--port", str(self.port), *arguments],
                              env=env, capture_output=True, text=True, timeout=30)

    def seed_audio(self, voice=None):
        if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
            self.skipTest("FFmpeg and ffprobe required for offline audio fixtures")
        voice = voice or self.voice
        text = "这是本地测试。KV Cache。"
        cid, params = server.context(text, .96)
        tid = server.digest({"context": cid, "voice": voice["id"]})
        captured = {}
        def fixture(provider, config, raw, response, recover=False):
            captured.update(provider=provider, request=config["request"])
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000:duration=3.5", str(raw)],
                           check=True, capture_output=True)
            return "DUMMY-OFFLINE-REQUEST"
        with mock.patch.object(tts, "request_audio", side_effect=fixture):
            self.library.generate(tid, voice, cid, params)
        self.assertEqual(self.library.jobs[tid]["status"], "ready")
        return tid, cid, text, captured

    def test_fresh_install_catalog_and_no_private_defaults(self):
        data = self.api("/api/catalog")
        self.assertEqual(len(data["voices"]), 32)
        self.assertIsNone(data["preset"])
        self.assertFalse(any(v.get("custom") for v in data["voices"]))
        self.assertEqual(tts.credentials(), {})

    def test_cli_status_and_voice_query_without_generation(self):
        done = self.cli("status")
        self.assertEqual(done.returncode, 0)
        status = json.loads(done.stdout)
        self.assertTrue(status["running"])
        self.assertEqual(status["configured_providers"], {"bailian": False, "minimax": False})
        self.assertEqual(status["saved_takes"], 0)
        listing = self.cli("voices", "--query", self.voice["name"])
        self.assertEqual(listing.returncode, 0)
        self.assertTrue(any(v["id"] == self.voice["id"] for v in json.loads(listing.stdout)))
        self.assertEqual(self.library.jobs, {})

    def test_open_returns_owned_service_url_without_generation(self):
        done = self.cli("open")
        self.assertEqual(done.returncode, 0)
        self.assertEqual(json.loads(done.stdout)["url"], f"http://127.0.0.1:{self.port}/")
        self.assertEqual(self.library.jobs, {})

    def test_select_persists_preset_and_clear_does_not_remove_audio(self):
        done = self.cli("select", "--voice", self.voice["name"], "--speed", "0.91", "--style", "natural")
        self.assertEqual(done.returncode, 0)
        preset = self.api("/api/catalog")["preset"]
        self.assertEqual((preset["voice_id"], preset["speed"], preset["style"]), (self.voice["id"], .91, "natural"))
        self.assertEqual(server.preset(), preset)
        self.assertEqual(self.cli("clear-preset").returncode, 0)
        self.assertIsNone(self.api("/api/preset")["preset"])
        self.assertTrue((self.root / "library/audio").is_dir())

    def test_context_changes_with_speed_and_direction(self):
        base, params = server.context("KV Cache", .96)
        self.assertEqual(params["text"], "K V Cache")
        self.assertNotEqual(base, server.context("KV Cache", .97)[0])
        self.assertNotEqual(base, server.context("KV Cache", .96, "不同讲述指令")[0])
        with self.assertRaises(ValueError):
            server.context("", .96)
        with self.assertRaises(ValueError):
            server.context("文稿", 3)

    def test_invalid_voice_is_rejected_before_enqueue(self):
        with self.assertRaises(ValueError):
            self.library.enqueue(["DUMMY-NOT-A-VOICE"], "文稿", .96)
        self.assertEqual(self.library.jobs, {})

    def test_json_credentials_and_sanitization_use_only_fixture(self):
        key = "DUMMY-PRIVATE-KEY-FOR-OFFLINE-TEST"
        (self.root / "credentials.env").write_text("DASHSCOPE_API_KEY=" + json.dumps(key) + "\n")
        tts.KEYS = tts.credentials()
        self.assertEqual(tts.KEYS["DASHSCOPE_API_KEY"], key)
        self.assertNotIn(key, tts.sanitized("error " + key))
        self.assertIn("[REDACTED]", tts.sanitized(key))

    def test_unknown_process_identity_is_not_reused(self):
        with mock.patch.object(voice_studio, "api", return_value={"app_id": "other", "data_dir": str(self.root), "pid": 0}):
            self.assertIsNone(voice_studio.running(self.port))
        with mock.patch.object(voice_studio, "api", return_value={"app_id": server.APP_ID, "data_dir": str(self.root / "other"), "pid": 0}):
            self.assertIsNone(voice_studio.running(self.port))

    def test_private_paths_and_traversal_are_not_served(self):
        (self.root / "credentials.env").write_text('DASHSCOPE_API_KEY="DUMMY"\n')
        for path in ("/credentials.env", "/cache/test", "/%2e%2e/%2e%2e/scripts/tts.py"):
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(f"http://127.0.0.1:{self.port}" + path)
            self.assertEqual(error.exception.code, 404)
            error.exception.close()

    def test_prebuilt_index_and_referenced_assets_are_served(self):
        import re
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/") as r:
            html = r.read().decode()
        self.assertIn("声音试听台", html)
        urls = re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html)
        self.assertTrue(urls)
        for path in urls:
            with urllib.request.urlopen(f"http://127.0.0.1:{self.port}" + path) as r:
                self.assertGreater(len(r.read()), 0)

    def test_offline_audio_range_and_cache_reuse(self):
        tid, cid, text, request = self.seed_audio()
        self.assertEqual(request["request"]["input"]["voice"], self.voice["voice_id"])
        self.assertIn("instruction", request["request"]["input"])
        with mock.patch.object(self.library.pool, "submit") as submit:
            state = self.library.enqueue([self.voice["id"]], text, .96)
            submit.assert_not_called()
        self.assertEqual(state["takes"][self.voice["id"]]["id"], tid)
        request = urllib.request.Request(f"http://127.0.0.1:{self.port}/audio/{tid}.mp3", headers={"Range": "bytes=0-31"})
        with urllib.request.urlopen(request) as r:
            self.assertEqual(r.status, 206)
            self.assertEqual(len(r.read()), 32)

    def test_cached_cli_export_mp3_wav_m4a_without_provider_calls(self):
        _, _, text, _ = self.seed_audio()
        manuscript = self.root / "narration.txt"
        manuscript.write_text(text)
        for extension in ("mp3", "wav", "m4a"):
            target = self.root / ("export." + extension)
            done = self.cli("generate", "--voice", self.voice["name"], "--text-file", str(manuscript), "--out", str(target))
            self.assertEqual(done.returncode, 0, done.stderr)
            result = json.loads(done.stdout)
            self.assertTrue(result["cached"])
            self.assertGreater(result["duration_seconds"], 0)
            metadata = json.loads(target.with_suffix(target.suffix + ".json").read_text())
            self.assertTrue(metadata["direction_applied"])
            self.assertEqual(metadata["text"], text)
            self.assertNotIn("DASHSCOPE_API_KEY", json.dumps(metadata))

    def test_minimax_payload_does_not_claim_instruction_support(self):
        voice = next(v for v in self.library.voices if v["provider"] == "minimax")
        _, _, _, captured = self.seed_audio(voice)
        request = captured["request"]
        self.assertEqual(request["voice_setting"]["voice_id"], voice["voice_id"])
        self.assertNotIn("instruction", request)
        self.assertEqual(request["audio_setting"]["sample_rate"], 32000)

    def test_existing_export_is_not_overwritten(self):
        target = self.root / "existing.mp3"
        target.write_bytes(b"DUMMY-KEEP-EXISTING")
        manuscript = self.root / "narration.txt"
        manuscript.write_text("文稿")
        done = self.cli("generate", "--voice", self.voice["name"], "--text-file", str(manuscript), "--out", str(target))
        self.assertNotEqual(done.returncode, 0)
        self.assertEqual(target.read_bytes(), b"DUMMY-KEEP-EXISTING")


if __name__ == "__main__":
    unittest.main()
