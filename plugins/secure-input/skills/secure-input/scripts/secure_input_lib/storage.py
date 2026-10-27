"""Explicit system backends only; the index contains metadata, never values."""
from __future__ import annotations

from contextlib import contextmanager
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time

from .model import InputError, digest, unique_object, validate_secret

SERVICE = "org.codex.secure-input.v1"


def state_dir():
    if sys.platform == "darwin":
        root = Path.home() / "Library" / "Application Support"
    elif os.name == "nt":
        root = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    else:
        root = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local" / "state"))
    path = root / "secure-input"
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    if path.is_symlink():
        raise InputError("unsafe_state_directory")
    restrict(path, directory=True)
    return path


def restrict(path, directory=False):
    if os.name != "nt":
        os.chmod(path, 0o700 if directory else 0o600)
        return
    # Set a protected DACL for this user and LocalSystem, before writing values.
    import ctypes
    from ctypes import wintypes as w
    adv = ctypes.WinDLL("advapi32", use_last_error=True)
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    adv.OpenProcessToken.argtypes = [w.HANDLE, w.DWORD, ctypes.POINTER(w.HANDLE)]
    adv.GetTokenInformation.argtypes = [w.HANDLE, ctypes.c_int, w.LPVOID, w.DWORD, ctypes.POINTER(w.DWORD)]
    adv.ConvertSidToStringSidW.argtypes = [w.LPVOID, ctypes.POINTER(w.LPWSTR)]
    adv.ConvertStringSecurityDescriptorToSecurityDescriptorW.argtypes = [w.LPCWSTR, w.DWORD, ctypes.POINTER(w.LPVOID), ctypes.POINTER(w.DWORD)]
    adv.GetSecurityDescriptorDacl.argtypes = [w.LPVOID, ctypes.POINTER(w.BOOL), ctypes.POINTER(w.LPVOID), ctypes.POINTER(w.BOOL)]
    adv.SetNamedSecurityInfoW.argtypes = [w.LPWSTR, ctypes.c_int, w.DWORD, w.LPVOID, w.LPVOID, w.LPVOID, w.LPVOID]
    adv.SetNamedSecurityInfoW.restype = w.DWORD
    kernel.GetCurrentProcess.restype = w.HANDLE
    kernel.CloseHandle.argtypes = [w.HANDLE]
    kernel.LocalFree.argtypes = [w.LPVOID]
    token = w.HANDLE()
    sid_string = w.LPWSTR()
    sd = w.LPVOID()
    try:
        if not adv.OpenProcessToken(kernel.GetCurrentProcess(), 8, ctypes.byref(token)):
            raise InputError("permission_setup_failed")
        size = w.DWORD()
        adv.GetTokenInformation(token, 1, None, 0, ctypes.byref(size))
        buf = ctypes.create_string_buffer(size.value)
        if not adv.GetTokenInformation(token, 1, buf, size, ctypes.byref(size)):
            raise InputError("permission_setup_failed")
        sid = ctypes.cast(buf, ctypes.POINTER(w.LPVOID))[0]
        if not adv.ConvertSidToStringSidW(sid, ctypes.byref(sid_string)):
            raise InputError("permission_setup_failed")
        inherit = "OICI" if directory else ""
        sddl = f"D:P(A;{inherit};FA;;;{sid_string.value})(A;{inherit};FA;;;SY)"
        if not adv.ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl, 1, ctypes.byref(sd), None):
            raise InputError("permission_setup_failed")
        present, defaulted, acl = w.BOOL(), w.BOOL(), w.LPVOID()
        if not adv.GetSecurityDescriptorDacl(sd, ctypes.byref(present), ctypes.byref(acl), ctypes.byref(defaulted)):
            raise InputError("permission_setup_failed")
        if adv.SetNamedSecurityInfoW(str(path), 1, 0x80000004, None, None, acl, None):
            raise InputError("permission_setup_failed")
    finally:
        if token:
            kernel.CloseHandle(token)
        if sid_string:
            kernel.LocalFree(ctypes.cast(sid_string, w.LPVOID))
        if sd:
            kernel.LocalFree(sd)


def atomic_write(path, data):
    path = Path(path)
    if path.is_symlink():
        raise InputError("symlink_target")
    fd, tmp = tempfile.mkstemp(prefix=".secure-input-", dir=path.parent)
    try:
        restrict(tmp)
        with os.fdopen(fd, "wb") as out:
            fd = -1
            out.write(data)
            out.flush()
            os.fsync(out.fileno())
        os.replace(tmp, path)
    finally:
        if fd != -1:
            os.close(fd)
        if os.path.exists(tmp):
            os.unlink(tmp)


@contextmanager
def locked(path):
    """An OS lock releases on process death. Lock file contains no data."""
    fd = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        restrict(path)
        try:
            if os.name == "nt":
                import msvcrt
                if os.fstat(fd).st_size == 0:
                    os.write(fd, b"\0")
                os.lseek(fd, 0, os.SEEK_SET)
                msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise InputError("request_in_progress") from None
        yield
    finally:
        os.close(fd)


class Vault:
    def __init__(self, root=None, backend=None):
        self.root = Path(root) if root else state_dir()
        self.root.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.backend = backend
        self.name = "unavailable"
        self.error = None
        if backend is not None:
            self.name = "test"
            return
        try:
            if sys.platform == "darwin":
                from keyring.backends.macOS import Keyring
                self.backend, self.name = Keyring(), "macos-keychain"
            elif os.name == "nt":
                from keyring.backends.Windows import WinVaultKeyring
                self.backend, self.name = WinVaultKeyring(), "windows-credential-manager"
            elif sys.platform.startswith("linux"):
                from keyring.backends.SecretService import Keyring
                self.backend, self.name = Keyring(), "linux-secret-service"
            else:
                raise InputError("unsupported_platform")
            # Evaluating priority checks whether the native backend is usable.
            if self.backend.priority <= 0:
                raise InputError("vault_unavailable")
        except Exception:
            self.backend, self.name, self.error = None, "unavailable", "vault_unavailable"

    def _call(self, method, *args):
        if self.backend is None:
            raise InputError("vault_unavailable")
        try:
            return getattr(self.backend, method)(SERVICE, *args)
        except Exception:
            raise InputError("vault_unavailable") from None

    def get(self, ref):
        raw = self._call("get_password", ref)
        if raw is None:
            return None
        try:
            obj = json.loads(raw)
            if obj["version"] != 1 or not isinstance(obj["grants"], list) or any(not re.fullmatch(r"[0-9a-f]{64}", x) for x in obj["grants"]):
                raise ValueError()
            validate_secret(obj["value"])
            return obj
        except Exception:
            raise InputError("invalid_vault_record") from None

    def put(self, ref, value, grants, scope_hash):
        validate_secret(value)
        raw = json.dumps({"version": 1, "value": value, "grants": sorted(set(grants))}, ensure_ascii=False)
        self._call("set_password", ref, raw)
        # The value and grants stay together in the encrypted system store.
        with locked(self.root / "index.lock"):
            index = self._index()
            index[ref] = {"scope_hash": scope_hash, "updated_at": int(time.time()), "backend": self.name}
            atomic_write(self.root / "index.json", json.dumps(index, sort_keys=True).encode())

    def delete(self, ref):
        if not re.fullmatch(r"si1_[0-9a-f]{40}", ref):
            raise InputError("invalid_reference")
        if self.get(ref) is not None:
            self._call("delete_password", ref)
        with locked(self.root / "index.lock"):
            index = self._index()
            index.pop(ref, None)
            atomic_write(self.root / "index.json", json.dumps(index, sort_keys=True).encode())

    def _index(self):
        p = self.root / "index.json"
        try:
            result = json.loads(p.read_text()) if p.exists() else {}
            if not isinstance(result, dict):
                raise ValueError()
            return result
        except Exception:
            raise InputError("invalid_metadata_index") from None

    def status(self, scope):
        records = self._index()
        refs = []
        for ref, entry in records.items():
            if entry["scope_hash"] == digest(scope):
                # Check actual system storage, rather than treating an index as proof.
                refs.append({"ref": ref, "present": self.get(ref) is not None})
        return refs
