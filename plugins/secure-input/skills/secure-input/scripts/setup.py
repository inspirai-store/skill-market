#!/usr/bin/env python3
"""Install only into this skill's .venv; no credential input occurs here."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import venv


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--browser", action="store_true")
    args = p.parse_args()
    if not (3, 11) <= sys.version_info[:2] <= (3, 14):
        print(json.dumps({"status": "blocked", "code": "python_3_11_to_3_14_required"}))
        return 3
    root = Path(__file__).resolve().parent.parent
    runtime = root / ".venv"
    python = runtime / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    try:
        if not python.is_file():
            venv.EnvBuilder(with_pip=True).create(runtime)
        cmd = [str(python), "-m", "pip", "install", "--disable-pip-version-check", "-r", str(root / "requirements.txt")]
        with open(os.devnull, "wb") as null:
            done = subprocess.run(cmd, stdout=null, stderr=null)
            if done.returncode:
                raise RuntimeError()
            if args.browser:
                done = subprocess.run([str(python), "-m", "playwright", "install", "chromium"], stdout=null, stderr=null)
                if done.returncode:
                    raise RuntimeError()
        print(json.dumps({"status": "completed", "result": "runtime_installed", "browser_requested": args.browser}))
        return 0
    except Exception:
        print(json.dumps({"status": "failed", "code": "runtime_install_failed"}))
        return 4


if __name__ == "__main__":
    raise SystemExit(main())
