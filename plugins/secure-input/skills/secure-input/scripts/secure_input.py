#!/usr/bin/env python3
"""Portable launcher; prefer this skill's isolated runtime when installed."""
from pathlib import Path
import os
import sys

root = Path(__file__).resolve().parent.parent
runtime = root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
if runtime.is_file() and Path(sys.prefix).absolute() != (root / ".venv").absolute():
    os.execv(str(runtime), [str(runtime), str(Path(__file__).resolve()), *sys.argv[1:]])

from secure_input_lib.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
