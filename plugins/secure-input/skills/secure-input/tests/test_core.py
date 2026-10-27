from __future__ import annotations

import copy
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from secure_input_lib.model import Field, InputError, Request, digest, origin
from secure_input_lib.engine import execute
from secure_input_lib.files import dotenv_content, json_content, write_config
from secure_input_lib.storage import Vault, locked

FAKE = "DUMMY-only-'\\\"$()`-测试-4719"


def spec(root, *, usage="reusable", kind="api_key", persistence="auto", refresh=False):
    return {
        "version": 1, "purpose": "本地假凭据验收", "scope": "secure-input/tests/provider/development",
        "persistence": persistence, "refresh": refresh,
        "fields": [{"name": "key", "label": "测试 Key", "kind": kind, "usage": usage}],
        "destination": {"type": "json", "path": str(Path(root) / "config.json"), "bindings": {"/provider/key": "key"}}
    }


class MemoryBackend:
    def __init__(self):
        self.values = {}

    def get_password(self, service, account):
        return self.values.get((service, account))

    def set_password(self, service, account, value):
        self.values[(service, account)] = value

    def delete_password(self, service, account):
        self.values.pop((service, account), None)


class FakeUI:
    def __init__(self, value=FAKE, cancel=False, fallback=True):
        self.value, self.cancel, self.use_fallback = value, cancel, fallback
        self.captures, self.fallbacks, self.notices = 0, 0, []

    def capture(self, request, existing, policies, vault_available):
        self.captures += 1
        self.policies = dict(policies)
        if self.cancel:
            return None
        return {f.name: self.value for f in request.fields}, policies

    def fallback(self):
        self.fallbacks += 1
        return self.use_fallback

    def notice(self, code):
        self.notices.append(code)

    def run_process(self, destination, values):
        self.injected = values.copy()
        return 0


class CoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.backend = MemoryBackend()
        self.vault = Vault(self.root / "state", self.backend)

    def tearDown(self):
        self.temp.cleanup()

    def test_auto_lifetime_and_otp(self):
        for usage, expected in [("one_shot", "session"), ("unknown", "session"), ("reusable", "system")]:
            self.assertEqual(Field("a", "a", "api_key", usage).lifetime("auto"), expected)
        self.assertEqual(Field("a", "a", "otp", "reusable").lifetime("system"), "session")

    def test_reuse_without_prompt(self):
        request = Request.parse(spec(self.root))
        first, second = FakeUI(), FakeUI(value="SHOULD-NOT-BE-USED")
        a = execute(request, self.vault, first)
        b = execute(request, self.vault, second)
        self.assertEqual((a["status"], b["status"]), ("completed", "completed"))
        self.assertEqual((first.captures, second.captures), (1, 0))
        self.assertEqual(json.loads((self.root / "config.json").read_text())["provider"]["key"], FAKE)
        self.assertNotIn(FAKE, json.dumps([a, b]))

    def test_changed_target_requires_confirmation(self):
        obj = spec(self.root)
        execute(Request.parse(obj), self.vault, FakeUI())
        obj["destination"]["path"] = str(self.root / "other.json")
        ui = FakeUI(cancel=True)
        self.assertEqual(execute(Request.parse(obj), self.vault, ui)["status"], "cancelled")
        self.assertEqual(ui.captures, 1)
        self.assertFalse((self.root / "other.json").exists())

    def test_changed_purpose_requires_confirmation(self):
        obj = spec(self.root)
        execute(Request.parse(obj), self.vault, FakeUI())
        obj["purpose"] = "另一个用途"
        ui = FakeUI(cancel=True)
        execute(Request.parse(obj), self.vault, ui)
        self.assertEqual(ui.captures, 1)

    def test_scope_isolation(self):
        obj = spec(self.root)
        first = Request.parse(obj)
        execute(first, self.vault, FakeUI())
        obj["scope"] += "/other"
        second = Request.parse(obj)
        self.assertNotEqual(first.ref(first.fields[0]), second.ref(second.fields[0]))
        self.assertEqual(self.vault.status(obj["scope"]), [])

    def test_refresh_replaces_then_forget(self):
        obj = spec(self.root)
        r = Request.parse(obj)
        execute(r, self.vault, FakeUI())
        obj["refresh"] = True
        ui = FakeUI("DUMMY-replacement")
        execute(Request.parse(obj), self.vault, ui)
        ref = r.ref(r.fields[0])
        self.assertEqual(self.vault.get(ref)["value"], "DUMMY-replacement")
        self.assertEqual(len(self.vault.status(r.scope)), 1)
        self.vault.delete(ref)
        self.assertIsNone(self.vault.get(ref))
        self.assertEqual(self.vault.status(r.scope), [])

    def test_cancel_does_not_write_or_save(self):
        result = execute(Request.parse(spec(self.root)), self.vault, FakeUI(cancel=True))
        self.assertEqual(result["status"], "cancelled")
        self.assertEqual(self.backend.values, {})
        self.assertFalse((self.root / "config.json").exists())

    def test_temporary_does_not_persist(self):
        for kind in ("api_key", "otp"):
            result = execute(Request.parse(spec(self.root, kind=kind, usage="one_shot")), self.vault, FakeUI())
            self.assertEqual(result["refs"], [])
        self.assertEqual(self.backend.values, {})

    def test_unavailable_vault_explicit_once_or_cancel(self):
        self.vault.backend = None
        ui = FakeUI()
        result = execute(Request.parse(spec(self.root)), self.vault, ui)
        self.assertEqual(result["refs"], [])
        self.assertEqual(ui.fallbacks, 1)
        self.assertEqual(ui.policies["key"], "session")
        (self.root / "config.json").unlink()
        ui = FakeUI(fallback=False)
        self.assertEqual(execute(Request.parse(spec(self.root)), self.vault, ui)["status"], "cancelled")
        self.assertFalse((self.root / "config.json").exists())

    def test_index_contains_metadata_not_secret(self):
        execute(Request.parse(spec(self.root)), self.vault, FakeUI())
        metadata = (self.vault.root / "index.json").read_text()
        self.assertNotIn(FAKE, metadata)
        self.assertNotIn("本地假凭据", metadata)

    def test_json_keeps_unrelated_data_and_restricts_permissions(self):
        p = self.root / "config.json"
        p.write_text('{"other":[1,true,"中文"],"provider":{"old":2}}')
        execute(Request.parse(spec(self.root, usage="one_shot")), self.vault, FakeUI())
        obj = json.loads(p.read_text())
        self.assertEqual(obj["other"], [1, True, "中文"])
        self.assertEqual(obj["provider"]["old"], 2)
        if os.name != "nt":
            self.assertEqual(p.stat().st_mode & 0o777, 0o600)
        self.assertEqual(list(self.root.glob(".secure-input-*")), [])

    def test_dotenv_round_trip_and_multiline_unrelated(self):
        from dotenv import dotenv_values
        old = "# keep\r\nNOTE='hello\nAPI_KEY=inside-note\nworld'\r\nexport API_KEY='old' # replaced\r\nOTHER=ok\r\n"
        content = dotenv_content(old, {"API_KEY": "key"}, {"key": FAKE})
        result = dotenv_values(stream=io.StringIO(content), interpolate=False)
        self.assertEqual(result["API_KEY"], FAKE)
        self.assertEqual(result["NOTE"], "hello\nAPI_KEY=inside-note\nworld")
        self.assertIn("# keep\r\n", content)
        self.assertIn("OTHER=ok\r\n", content)

    def test_dotenv_duplicate_and_interpolation_block(self):
        for content, value in [("KEY=x\nKEY=y\n", "dummy"), ("", "${DUMMY}")]:
            with self.assertRaises(InputError):
                dotenv_content(content, {"KEY": "key"}, {"key": value})

    def test_json_duplicate_and_nonobject_parent_block(self):
        for content in ['{"a":1,"a":2}', '{"a":1}']:
            with self.assertRaises(InputError):
                json_content(content, {"/a/b": "key"}, {"key": FAKE})

    @unittest.skipIf(os.name == "nt", "symlink privilege differs on Windows")
    def test_symlink_target_block(self):
        p = self.root / "target.json"
        p.write_text("{}")
        (self.root / "link.json").symlink_to(p)
        obj = spec(self.root)
        obj["destination"]["path"] = str(self.root / "link.json")
        with self.assertRaises(InputError):
            Request.parse(obj)
        self.assertEqual(p.read_text(), "{}")

    def test_secret_payload_cannot_enter_spec(self):
        obj = spec(self.root)
        obj["fields"][0]["value"] = FAKE
        with self.assertRaises(InputError):
            Request.parse(obj)

    def test_invalid_targets_block(self):
        for d in [{"type": "browser", "url": "http://example.com"},
                  {"type": "browser", "url": "https://user:pass@example.com"},
                  {"type": "json", "path": "relative.json", "bindings": {"/key": "key"}}]:
            obj = spec(self.root)
            obj["destination"] = d
            with self.assertRaises(InputError):
                Request.parse(obj)

    def test_origin_exact_normalization(self):
        self.assertEqual(origin("https://EXAMPLE.COM:443/x"), "https://example.com")
        self.assertNotEqual(origin("https://example.com:444"), origin("https://example.com"))

    def test_process_injection_does_not_mutate_environment(self):
        obj = spec(self.root, usage="one_shot")
        obj["destination"] = {"type": "process", "executable": sys.executable, "cwd": str(self.root), "args": [], "bindings": {"SI_DUMMY_TEST": "key"}}
        before = os.environ.copy()
        ui = FakeUI()
        result = execute(Request.parse(obj), self.vault, ui)
        self.assertEqual(ui.injected, {"key": FAKE})
        self.assertEqual(os.environ, before)
        self.assertEqual(result["child_exit_code"], 0)

    def test_concurrent_same_scope_lock(self):
        with locked(self.root / "operation.lock"):
            with self.assertRaises(InputError):
                with locked(self.root / "operation.lock"):
                    self.fail("second operation entered")

    def test_native_prints_and_exception_messages_are_not_returned(self):
        script = '''
import sys, os
sys.path.insert(0, sys.argv[1])
from secure_input_lib import cli
def bad(args):
    print("DUMMY-SENTINEL-NEVER-RETURN")
    os.write(2,b"DUMMY-SENTINEL-NEVER-RETURN")
    raise RuntimeError("DUMMY-SENTINEL-NEVER-RETURN")
cli.dispatch = bad
raise SystemExit(cli.main(["doctor"]))
'''
        done = subprocess.run([sys.executable, "-c", script, str(ROOT / "scripts")], capture_output=True, text=True)
        self.assertNotIn("DUMMY-SENTINEL", done.stdout + done.stderr)
        self.assertEqual(json.loads(done.stdout)["code"], "operation_failed")
        self.assertEqual(done.returncode, 4)

    def test_failed_store_rolls_back_before_once_fallback(self):
        original = self.backend.set_password
        first = True
        def fail_after_write(service, account, value):
            nonlocal first
            original(service, account, value)
            if first:
                first = False
                raise RuntimeError("dummy-native-failure")
        self.backend.set_password = fail_after_write
        ui = FakeUI()
        result = execute(Request.parse(spec(self.root)), self.vault, ui)
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["refs"], [])
        self.assertEqual(ui.fallbacks, 1)
        self.assertEqual(self.backend.values, {})

    def test_no_desktop_returns_without_chat_prompt(self):
        script = '''
import sys,os
sys.path.insert(0,sys.argv[1])
from secure_input_lib import ui,cli
sys.platform="linux"
os.environ.pop("DISPLAY",None)
os.environ.pop("WAYLAND_DISPLAY",None)
cli.dispatch=lambda args: ui.desktop_preflight()
raise SystemExit(cli.main(["doctor"]))
'''
        done = subprocess.run([sys.executable, "-c", script, str(ROOT / "scripts")], capture_output=True, text=True)
        self.assertEqual(done.returncode, 3)
        self.assertEqual(json.loads(done.stdout)["code"], "desktop_unavailable")

    def test_invalid_cli_arguments_not_echoed(self):
        done = subprocess.run([sys.executable, str(ROOT / "scripts/secure_input.py"), "get", "DUMMY-SENTINEL-NEVER-RETURN"], capture_output=True, text=True)
        self.assertNotIn("DUMMY-SENTINEL", done.stdout + done.stderr)
        self.assertEqual(json.loads(done.stdout)["code"], "invalid_arguments")


if __name__ == "__main__":
    unittest.main()
