"""One-way delivery to explicitly selected plaintext config files."""
from __future__ import annotations

import json
import io
from pathlib import Path
import re

from .model import InputError, unique_object
from .storage import atomic_write


def dotenv_content(original, bindings, values):
    replacements = {}
    for key, field in bindings.items():
        value = values[field]
        # Interpolation differs across .env consumers. Never silently alter it.
        if "${" in value:
            raise InputError("dotenv_interpolation_unsupported")
        replacements[key] = "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"
    from dotenv.parser import parse_stream
    statements = list(parse_stream(io.StringIO(original)))
    found = set()
    result = []
    newline = "\r\n" if "\r\n" in original else "\n"
    for statement in statements:
        line = statement.original.string
        if statement.error:
            raise InputError("invalid_dotenv")
        match = re.match(r"^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
        if statement.key in replacements:
            key = statement.key
            if key in found:
                raise InputError("duplicate_dotenv_binding")
            found.add(key)
            result.append((match.group(1) if match else "") + key + "=" + replacements[key] + newline)
        else:
            result.append(line)
    if result and not result[-1].endswith(("\n", "\r")):
        result[-1] += newline
    for key, value in replacements.items():
        if key not in found:
            result.append(key + "=" + value + newline)
    return "".join(result)


def json_content(original, bindings, values):
    try:
        obj = json.loads(original, object_pairs_hook=unique_object) if original.strip() else {}
    except InputError:
        raise
    except Exception:
        raise InputError("invalid_config_json") from None
    if not isinstance(obj, dict):
        raise InputError("config_object_required")
    for pointer, field in bindings.items():
        parts = [p.replace("~1", "/").replace("~0", "~") for p in pointer.split("/")[1:]]
        parent = obj
        for token in parts[:-1]:
            if token not in parent:
                parent[token] = {}
            parent = parent[token]
            if not isinstance(parent, dict):
                raise InputError("json_pointer_parent_not_object")
        parent[parts[-1]] = values[field]
    return json.dumps(obj, ensure_ascii=False, indent=2, allow_nan=False) + "\n"


def write_config(destination, values):
    path = Path(destination["path"])
    if path.is_symlink():
        raise InputError("symlink_target")
    try:
        original = path.read_bytes().decode("utf-8") if path.exists() else ""
        if len(original) > 8 * 1024 * 1024:
            raise InputError("config_too_large")
        func = dotenv_content if destination["type"] == "dotenv" else json_content
        content = func(original, destination["bindings"], values)
        atomic_write(path, content.encode("utf-8"))
    except InputError:
        raise
    except Exception:
        raise InputError("config_write_failed") from None
