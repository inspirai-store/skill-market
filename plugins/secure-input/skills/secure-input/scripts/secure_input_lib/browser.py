"""A private browser session; the page is never returned to an AI browser tool."""
from __future__ import annotations

import json
import os
import re

from .model import InputError, origin

PICKER = r"""
({label, binding}) => {
  if (window.__siCleanup) window.__siCleanup();
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;padding:14px 18px;background:#17211f;color:white;border-radius:10px;font:15px system-ui;box-shadow:0 4px 20px #0004';
  banner.textContent = '选择输入框：' + label + '　';
  const cancel = document.createElement('button');
  cancel.textContent = '取消';
  cancel.onclick = e => { if (e.isTrusted) window[binding](null); };
  banner.appendChild(cancel);
  document.documentElement.appendChild(banner);
  const click = e => {
    const target = e.composedPath()[0];
    if (!e.isTrusted || !(target instanceof HTMLInputElement) || target.disabled || target.readOnly ||
        ['hidden','submit','button','checkbox','radio','file','image','range','color'].includes(target.type)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const token = crypto.randomUUID();
    target.setAttribute('data-secure-input-selection', token);
    window[binding](token);
  };
  document.addEventListener('click', click, true);
  window.__siCleanup = () => { document.removeEventListener('click', click, true); banner.remove(); delete window.__siCleanup; };
}
"""


class BrowserSession:
    def __init__(self, request, ui, *, playwright=None):
        self.request, self.ui = request, ui
        self.driver = self.browser = self.context = self.page = None
        self.selected = []
        self.approved = set()
        self.external_approval = False
        self._injected = playwright

    def open(self):
        # Never enable protocol logging, tracing, screenshots or storage_state exports.
        os.environ.pop("DEBUG", None)
        os.environ.pop("PWDEBUG", None)
        try:
            if self._injected:
                self.driver = self._injected
            else:
                from playwright.sync_api import sync_playwright
                self.driver = sync_playwright().start()
            self.browser = self.driver.chromium.launch(headless=False, args=["--disable-logging", "--disable-breakpad"])
            self.context = self.browser.new_context(accept_downloads=False)
            self.page = self.context.new_page()
            self.page.goto(self.request.destination["url"], wait_until="domcontentloaded", timeout=60000)
            return self
        except Exception:
            self.close()
            raise InputError("browser_unavailable") from None

    def select(self):
        expected = origin(self.request.destination["url"])
        import uuid
        binding = "__si_" + uuid.uuid4().hex
        picked = []

        def receive(source, token):
            picked.append((source["frame"], token))

        self.page.expose_binding(binding, receive)
        for field in self.request.fields:
            selected = None
            installed = set()
            while selected is None:
                if self.page.is_closed():
                    raise InputError("cancelled")
                # Install only into live documents; a navigation creates new state.
                for frame in self.page.frames:
                    try:
                        token = (id(frame), frame.url, frame.evaluate("performance.timeOrigin"))
                        if token not in installed:
                            frame.evaluate(PICKER, {"label": field.label, "binding": binding})
                            installed.add(token)
                    except Exception:
                        continue
                try:
                    self.page.wait_for_timeout(80)
                except Exception:
                    raise InputError("cancelled") from None
                if not picked:
                    continue
                frame, token = picked.pop(0)
                picked.clear()
                try:
                    if token is None:
                        raise InputError("cancelled")
                    if not isinstance(token, str) or not re.fullmatch(r"[0-9a-f-]{36}", token):
                        continue
                    handles = frame.query_selector_all('[data-secure-input-selection="' + token + '"]')
                    if len(handles) != 1:
                        continue
                    handle = handles[0]
                    top, recipient = origin(self.page.url), origin(frame.url)
                    if (top, recipient) not in self.approved:
                        if top != expected or recipient != expected:
                            if not self.ui.confirm_origin(top, recipient):
                                raise InputError("cancelled")
                            self.external_approval = True
                        self.approved.add((top, recipient))
                    valid = handle.evaluate("e => e instanceof HTMLInputElement && !e.disabled && !e.readOnly && !['hidden','submit','button','checkbox','radio','file','image','range','color'].includes(e.type)")
                    box = handle.bounding_box()
                    if not valid or not box or not handle.is_visible():
                        continue
                    selected = (field.name, frame, handle, top, recipient)
                    handle.evaluate("e => e.removeAttribute('data-secure-input-selection')")
                except InputError:
                    raise
                except Exception:
                    continue
            self.selected.append(selected)
            for frame in self.page.frames:
                try:
                    frame.evaluate("() => window.__siCleanup?.()")
                except Exception:
                    pass
        self.ui.recipient_origins = sorted({(top, recipient) for _, _, _, top, recipient in self.selected})
        return self

    def fill(self, values):
        try:
            # Validate every chosen recipient before sending the first value.
            for _, frame, handle, top, recipient in self.selected:
                if origin(self.page.url) != top or origin(frame.url) != recipient or not handle.is_visible():
                    raise InputError("browser_target_changed")
            for name, frame, handle, top, recipient in self.selected:
                if origin(self.page.url) != top or origin(frame.url) != recipient:
                    raise InputError("browser_target_changed")
                handle.fill(values[name], timeout=5000)
        except InputError:
            raise
        except Exception:
            raise InputError("browser_fill_failed") from None

    def wait_for_close(self):
        # The user submits in the browser. No assertion about remote saving is made.
        try:
            while self.browser.is_connected() and not self.page.is_closed():
                self.page.wait_for_timeout(200)
        except Exception:
            pass

    def close(self):
        for obj in (self.context, self.browser):
            if obj:
                try:
                    obj.close()
                except Exception:
                    pass
        if self.driver and not self._injected:
            try:
                self.driver.stop()
            except Exception:
                pass
        self.selected.clear()
