"""Collect and deliver in one local operation; ephemeral values never need a handle."""
from __future__ import annotations

from .browser import BrowserSession
from .files import write_config
from .model import InputError, validate_secret


def save_batch(request, vault, values, policies, existing, *, allow_grant=True):
    changed = []
    try:
        for f in request.fields:
            if policies[f.name] != "system":
                continue
            old = existing.get(f.name)
            grants = set(old["grants"]) if old and old["value"] == values[f.name] else set()
            if allow_grant:
                grants.add(request.target)
            if old and old["value"] == values[f.name] and grants == set(old["grants"]):
                continue
            changed.append(f)
            vault.put(request.ref(f), values[f.name], grants, request.scope_hash)
    except InputError:
        rollback_failed = False
        for f in reversed(changed):
            old = existing.get(f.name)
            try:
                if old:
                    vault.put(request.ref(f), old["value"], old["grants"], request.scope_hash)
                else:
                    vault.delete(request.ref(f))
            except InputError:
                rollback_failed = True
        raise InputError("vault_partial_update" if rollback_failed else "vault_unavailable") from None


def execute(request, vault, ui, browser_factory=BrowserSession):
    existing = {}
    policies = {f.name: f.lifetime(request.persistence) for f in request.fields}
    vault_available = vault.backend is not None
    unavailable = False
    for f in request.fields:
        if f.kind == "otp" or f.usage == "one_shot":
            continue
        if not vault_available:
            unavailable = True
            continue
        try:
            record = vault.get(request.ref(f))
            if record:
                existing[f.name] = record
                if request.persistence == "auto" and f.usage != "one_shot":
                    policies[f.name] = "system"
        except InputError:
            unavailable, vault_available = True, False
            existing.clear()
            break
    if (unavailable or not vault_available) and "system" in policies.values():
        if not ui.fallback():
            return {"status": "cancelled", "code": "cancelled"}
        policies = {f.name: "session" for f in request.fields}
        existing.clear()
        vault_available = False
    browser = None
    values = {}
    try:
        if request.destination["type"] == "browser":
            browser = browser_factory(request, ui)
            browser.open().select()
        needs_prompt = request.refresh or len(existing) != len(request.fields) or any(request.target not in r["grants"] for r in existing.values())
        # Cross-origin approvals are session-only and never silently reused.
        if browser and browser.external_approval:
            needs_prompt = True
        if needs_prompt:
            captured = ui.capture(request, existing, policies, vault_available)
            if captured is None:
                return {"status": "cancelled", "code": "cancelled"}
            values, policies = captured
        else:
            values = {name: r["value"] for name, r in existing.items()}
        if set(values) != {f.name for f in request.fields}:
            raise InputError("invalid_capture")
        for f in request.fields:
            validate_secret(values[f.name])
            if policies.get(f.name) not in ("session", "system") or (f.kind == "otp" and policies[f.name] != "session"):
                raise InputError("invalid_capture")
        try:
            save_batch(request, vault, values, policies, existing, allow_grant=not (browser and browser.external_approval))
        except InputError as e:
            if e.code != "vault_unavailable":
                raise
            if not ui.fallback():
                return {"status": "cancelled", "code": "cancelled"}
            policies = {f.name: "session" for f in request.fields}
        kind = request.destination["type"]
        if kind == "process":
            code = ui.run_process(request.destination, values)
            result = {"status": "completed" if code == 0 else "failed", "result": "exited", "child_exit_code": code}
        elif kind in ("dotenv", "json"):
            write_config(request.destination, values)
            result = {"status": "completed", "result": "written"}
        else:
            browser.fill(values)
            # Drop our Python references before waiting for the user's submission.
            values.clear()
            existing.clear()
            browser.wait_for_close()
            result = {"status": "completed", "result": "filled", "remote_saved": "unverified"}
        result["refs"] = [request.ref(f) for f in request.fields if policies[f.name] == "system"]
        return result
    except InputError as e:
        if e.code == "cancelled":
            return {"status": "cancelled", "code": "cancelled"}
        ui.notice(e.code)
        raise
    finally:
        values.clear()
        existing.clear()
        if browser:
            browser.close()
