"""Only a small, fixed JSON result can leave this process."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
import importlib.util
import json
import os
from pathlib import Path
import sys
import uuid

from . import VERSION
from .model import InputError, Request


@contextmanager
def private_stdio():
    # Covers native libraries and subprocess-driver diagnostics, not just print().
    sys.stdout.flush()
    sys.stderr.flush()
    saved = (os.dup(1), os.dup(2))
    null = os.open(os.devnull, os.O_WRONLY)
    try:
        os.dup2(null, 1)
        os.dup2(null, 2)
        yield
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
        for fd, original in zip((1, 2), saved):
            os.dup2(original, fd)
            os.close(original)
        os.close(null)


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise InputError("invalid_arguments")


def parser():
    p = Parser(prog="secure-input", description="Local secure credential input. Results never contain values.")
    sub = p.add_subparsers(dest="command", required=True, parser_class=Parser)
    sub.add_parser("doctor")
    r = sub.add_parser("request")
    r.add_argument("--spec", required=True)
    s = sub.add_parser("status")
    s.add_argument("--scope", required=True)
    f = sub.add_parser("forget")
    f.add_argument("--ref", required=True)
    return p


def doctor():
    deps = {}
    for module in ("PySide6.QtWidgets", "keyring", "playwright.sync_api", "dotenv"):
        try:
            __import__(module)
            deps[module.split(".")[0]] = True
        except Exception:
            deps[module.split(".")[0]] = False
    desktop = os.name == "nt" or sys.platform == "darwin" or bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))
    if desktop and deps.get("PySide6"):
        try:
            from .ui import desktop_preflight
            desktop_preflight()
        except InputError:
            desktop = False
    backend = "unavailable"
    if deps.get("keyring"):
        from .storage import Vault
        backend = Vault().name
    chromium = False
    if deps.get("playwright"):
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                chromium = Path(p.chromium.executable_path).is_file()
        except Exception:
            pass
    return {"status": "completed", "version": VERSION, "platform": sys.platform,
            "dependencies": deps, "desktop_session": desktop, "vault_backend": backend,
            "chromium_installed": chromium, "ready": all(deps.values()) and desktop and backend != "unavailable" and chromium}


def dispatch(args):
    if args.command == "doctor":
        return doctor()
    from .storage import Vault, locked, state_dir
    vault = Vault()
    if args.command == "status":
        return {"status": "completed", "backend": vault.name, "credentials": vault.status(args.scope)}
    if args.command == "forget":
        vault.delete(args.ref)
        return {"status": "completed", "result": "forgotten"}
    request = Request.load(args.spec)
    from .ui import DesktopUI
    from .engine import execute
    with locked(state_dir() / (request.scope_hash + ".lock")):
        return execute(request, vault, DesktopUI())


def main(argv=None):
    request_id = str(uuid.uuid4())
    try:
        args = parser().parse_args(argv)
        with private_stdio():
            result = dispatch(args)
    except InputError as e:
        result = {"status": "cancelled" if e.code == "cancelled" else "blocked", "code": e.code}
    except (ImportError, ModuleNotFoundError):
        result = {"status": "blocked", "code": "dependencies_missing"}
    except KeyboardInterrupt:
        result = {"status": "cancelled", "code": "cancelled"}
    except Exception:
        # Never stringify exceptions, arguments, file content or browser handles.
        result = {"status": "failed", "code": "operation_failed"}
    result["request_id"] = request_id
    print(json.dumps(result, ensure_ascii=True, separators=(",", ":")), flush=True)
    return {"completed": 0, "cancelled": 2, "blocked": 3, "failed": 4}.get(result["status"], 4)
