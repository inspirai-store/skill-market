"""Opt-in native credential store acceptance. Creates and removes only a dummy record."""
from pathlib import Path
import json
import sys
import tempfile
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from secure_input_lib.storage import Vault
from secure_input_lib.model import digest
from secure_input_lib.cli import private_stdio


def main():
    scope = "secure-input/native-dummy-acceptance/" + uuid.uuid4().hex
    ref = "si1_" + digest(scope)[:40]
    with tempfile.TemporaryDirectory() as temporary:
        vault = Vault(temporary)
        if vault.backend is None:
            return {"status": "blocked", "code": "vault_unavailable"}
        try:
            vault.put(ref, "DUMMY-NATIVE-ONLY-A", [digest("dummy-target")], digest(scope))
            assert vault.get(ref)["value"] == "DUMMY-NATIVE-ONLY-A"
            assert vault.status(scope) == [{"ref": ref, "present": True}]
            vault.put(ref, "DUMMY-NATIVE-ONLY-B", [digest("dummy-target")], digest(scope))
            assert vault.get(ref)["value"] == "DUMMY-NATIVE-ONLY-B"
            vault.delete(ref)
            assert vault.get(ref) is None
            return {"status": "completed", "backend": vault.name, "checks": ["save", "read-in-helper", "status", "replace", "delete"]}
        finally:
            if vault.get(ref) is not None:
                vault.delete(ref)


if __name__ == "__main__":
    try:
        with private_stdio():
            result = main()
    except Exception:
        result = {"status": "failed", "code": "native_vault_test_failed"}
    print(json.dumps(result))
    raise SystemExit(0 if result["status"] == "completed" else 1)
