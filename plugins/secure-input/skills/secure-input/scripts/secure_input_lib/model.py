"""Non-secret request contract and deterministic lifetime policy."""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import re
from urllib.parse import urlsplit


class InputError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def digest(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=True,
                                     separators=(",", ":")).encode()).hexdigest()


def text(value, maximum=4096):
    if not isinstance(value, str) or not value or len(value) > maximum or any(c in value for c in "\x00\r\n"):
        raise InputError("invalid_spec")
    return value


def keys(obj, required, optional=()):
    if not isinstance(obj, dict) or not set(required) <= obj.keys() or obj.keys() - set(required) - set(optional):
        raise InputError("invalid_spec")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise InputError("duplicate_json_key")
        result[key] = value
    return result


def origin(url):
    try:
        p = urlsplit(url)
        if p.scheme != "https" or not p.hostname or p.username or p.password:
            raise InputError("https_required")
        host = p.hostname.encode("idna").decode("ascii").lower()
        host = f"[{host}]" if ":" in host else host
        port = p.port
        return f"https://{host}" + (f":{port}" if port and port != 443 else "")
    except (ValueError, UnicodeError):
        raise InputError("invalid_url") from None


def absolute_path(value, *, directory=False, reject_symlink=False):
    p = Path(text(value))
    if not p.is_absolute():
        raise InputError("absolute_path_required")
    if reject_symlink and p.is_symlink():
        raise InputError("symlink_target")
    p = p.resolve()
    if directory and not p.is_dir():
        raise InputError("directory_missing")
    return str(p)


@dataclass(frozen=True)
class Field:
    name: str
    label: str
    kind: str
    usage: str

    def lifetime(self, policy):
        if self.kind == "otp":
            return "session"
        if policy != "auto":
            return policy
        return "system" if self.usage == "reusable" else "session"


@dataclass(frozen=True)
class Request:
    purpose: str
    scope: str
    fields: tuple[Field, ...]
    persistence: str
    refresh: bool
    destination: dict

    @property
    def scope_hash(self):
        return digest(self.scope)

    def ref(self, field):
        return "si1_" + digest([self.scope, field.name])[:40]

    @property
    def target(self):
        d = dict(self.destination)
        if d["type"] == "browser":
            d = {"type": "browser", "origin": origin(d["url"])}
        return digest([self.purpose, d])

    @classmethod
    def load(cls, path):
        try:
            raw = Path(path).read_bytes()
            if len(raw) > 131072:
                raise InputError("spec_too_large")
            obj = json.loads(raw, object_pairs_hook=unique_object)
            return cls.parse(obj)
        except InputError:
            raise
        except Exception:
            raise InputError("invalid_spec") from None

    @classmethod
    def parse(cls, obj):
        keys(obj, ("version", "purpose", "scope", "fields", "destination"), ("persistence", "refresh"))
        if obj["version"] != 1 or type(obj["version"]) is not int:
            raise InputError("unsupported_version")
        purpose, scope = text(obj["purpose"], 1000), text(obj["scope"], 1000)
        persistence = obj.get("persistence", "auto")
        refresh = obj.get("refresh", False)
        if persistence not in ("auto", "session", "system") or type(refresh) is not bool:
            raise InputError("invalid_spec")
        if not isinstance(obj["fields"], list) or not 1 <= len(obj["fields"]) <= 16:
            raise InputError("invalid_spec")
        fields = []
        for f in obj["fields"]:
            keys(f, ("name", "label", "kind", "usage"))
            name = text(f["name"], 128)
            if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.-]*", name):
                raise InputError("invalid_field_name")
            if f["kind"] not in ("api_key", "token", "password", "otp") or f["usage"] not in ("one_shot", "reusable", "unknown"):
                raise InputError("invalid_spec")
            fields.append(Field(name, text(f["label"], 200), f["kind"], f["usage"]))
        names = {f.name for f in fields}
        if len(names) != len(fields):
            raise InputError("duplicate_field")
        d = obj["destination"]
        if not isinstance(d, dict):
            raise InputError("invalid_destination")
        kind = d.get("type")
        if kind == "browser":
            keys(d, ("type", "url"))
            origin(text(d["url"]))
            d = dict(d)
        elif kind in ("process", "dotenv", "json"):
            if kind == "process":
                keys(d, ("type", "executable", "args", "cwd", "bindings"), ("timeout_seconds",))
                d = dict(d)
                d["executable"] = absolute_path(d["executable"])
                d["cwd"] = absolute_path(d["cwd"], directory=True)
                if not Path(d["executable"]).is_file():
                    raise InputError("executable_missing")
                if not isinstance(d["args"], list) or len(d["args"]) > 128:
                    raise InputError("invalid_arguments")
                for a in d["args"]:
                    if not isinstance(a, str) or len(a) > 8192 or "\x00" in a:
                        raise InputError("invalid_arguments")
                timeout = d.get("timeout_seconds", 3600)
                if type(timeout) not in (int, float) or not 1 <= timeout <= 86400:
                    raise InputError("invalid_timeout")
                d["timeout_seconds"] = timeout
            else:
                keys(d, ("type", "path", "bindings"))
                d = dict(d)
                d["path"] = absolute_path(d["path"], reject_symlink=True)
                if not Path(d["path"]).parent.is_dir():
                    raise InputError("directory_missing")
            bindings = d["bindings"]
            if not isinstance(bindings, dict) or not bindings or any(not isinstance(v, str) for v in bindings.values()) or set(bindings.values()) != names:
                raise InputError("invalid_bindings")
            for key in bindings:
                text(key)
                if kind in ("process", "dotenv") and not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
                    raise InputError("invalid_environment_name")
                if kind == "json" and (not key.startswith("/") or re.search(r"~(?![01])", key)):
                    raise InputError("invalid_json_pointer")
            if kind == "json":
                tokens = [key.split("/")[1:] for key in bindings]
                for i, a in enumerate(tokens):
                    if any(a == b[:len(a)] for j, b in enumerate(tokens) if i != j):
                        raise InputError("overlapping_json_pointers")
        else:
            raise InputError("invalid_destination")
        return cls(purpose, scope, tuple(fields), persistence, refresh, d)


def validate_secret(value):
    if not isinstance(value, str) or not value or len(value.encode("utf-8")) > 16384 or any(c in value for c in "\x00\r\n"):
        raise InputError("invalid_secret")


def describe_destination(d):
    if d["type"] == "browser":
        return "网站", origin(d["url"])
    if d["type"] in ("dotenv", "json"):
        return "明文文件", d["path"]
    # This is displayed locally only. No shell interprets this representation.
    return "接收程序", json.dumps([d["executable"], *d["args"]], ensure_ascii=False) + "\n工作目录：" + d["cwd"]
