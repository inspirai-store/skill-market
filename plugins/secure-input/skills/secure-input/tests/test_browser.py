"""Controlled HTTPS fixtures; no real provider accounts or credentials."""
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "tests"))
from secure_input_lib.browser import BrowserSession
from secure_input_lib.model import InputError, Request
from test_core import FAKE, spec
from playwright.sync_api import sync_playwright

HTML = """<!doctype html><meta charset=utf-8><title>Dummy credential fixture</title>
<h1>本地假凭据验收</h1><form onsubmit="window.submitted=true;event.preventDefault()">
<label>API Key <input id=key type=password autocomplete=off></label>
<button type=submit>保存</button></form><script>window.submitted=false</script>"""


class BrowserUI:
    def __init__(self, approve=True):
        self.confirmations = []
        self.approve = approve

    def confirm_origin(self, top, frame):
        self.confirmations.append((top, frame))
        return self.approve


class BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.driver = sync_playwright().start()
        cls.browser = cls.driver.chromium.launch(headless=False)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.driver.stop()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        obj = spec(self.temp.name)
        obj["destination"] = {"type": "browser", "url": "https://safe.test/settings"}
        self.request = Request.parse(obj)
        self.context = self.browser.new_context(accept_downloads=False)
        self.context.route("**/*", lambda route: route.fulfill(status=200, content_type="text/html", body=HTML))
        self.page = self.context.new_page()
        self.page.goto(obj["destination"]["url"])
        self.ui = BrowserUI()
        self.session = BrowserSession(self.request, self.ui, playwright=self.driver)
        self.session.browser, self.session.context, self.session.page = self.browser, self.context, self.page

    def tearDown(self):
        self.context.close()
        self.temp.cleanup()

    def click_while_selecting(self, selector="#key", frame=None):
        original = self.page.wait_for_timeout
        clicked = False
        def wait(ms):
            nonlocal clicked
            if not clicked:
                clicked = True
                (frame or self.page).click(selector)
            original(min(ms, 20))
        self.page.wait_for_timeout = wait

    def test_real_picker_fill_and_no_submit(self):
        self.click_while_selecting()
        self.session.select()
        self.session.fill({"key": FAKE})
        self.assertEqual(self.page.input_value("#key"), FAKE)
        self.assertFalse(self.page.evaluate("window.submitted"))
        self.assertEqual(self.ui.confirmations, [])

    def test_cross_origin_requires_explicit_confirmation(self):
        self.page.goto("https://other.test/settings")
        self.ui.approve = False
        self.click_while_selecting()
        with self.assertRaises(InputError) as error:
            self.session.select()
        self.assertEqual(error.exception.code, "cancelled")
        self.assertEqual(self.ui.confirmations, [("https://other.test", "https://other.test")])
        self.assertEqual(self.page.input_value("#key"), "")

    def test_cross_origin_approval_is_session_only(self):
        self.page.goto("https://other.test/settings")
        self.click_while_selecting()
        self.session.select()
        self.assertTrue(self.session.external_approval)
        self.session.fill({"key": FAKE})
        self.assertFalse(self.page.evaluate("window.submitted"))

    def test_navigation_after_selection_blocks_delivery(self):
        self.click_while_selecting()
        self.session.select()
        self.page.goto("https://other.test/settings")
        with self.assertRaises(InputError) as error:
            self.session.fill({"key": FAKE})
        self.assertEqual(error.exception.code, "browser_target_changed")
        self.assertEqual(self.page.input_value("#key"), "")

    def test_cross_origin_iframe_requires_confirmation(self):
        self.page.set_content('<iframe src="https://frame.test/form"></iframe>')
        frame = self.page.frames[1]
        frame.wait_for_selector("#key")
        self.ui.approve = False
        self.click_while_selecting(frame=frame)
        with self.assertRaises(InputError):
            self.session.select()
        self.assertEqual(self.ui.confirmations, [("https://safe.test", "https://frame.test")])

    def test_browser_context_does_not_reuse_login_state(self):
        self.page.evaluate("localStorage.setItem('dummy-login','dummy')")
        fresh = self.browser.new_context()
        fresh.route("**/*", lambda route: route.fulfill(status=200, body=HTML))
        page = fresh.new_page()
        page.goto("https://safe.test/settings")
        self.assertIsNone(page.evaluate("localStorage.getItem('dummy-login')"))
        fresh.close()


if __name__ == "__main__":
    unittest.main()
