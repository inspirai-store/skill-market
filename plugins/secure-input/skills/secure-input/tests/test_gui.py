"""Native Qt smoke tests using only dummy credentials. Run explicitly on a desktop."""
from pathlib import Path
import os
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "tests"))
from secure_input_lib.model import Request
from secure_input_lib.ui import DesktopUI, app
from test_core import FAKE, spec
from PySide6.QtCore import QTimer, Qt
from PySide6.QtWidgets import QDialog, QDialogButtonBox, QLabel, QLineEdit, QPlainTextEdit, QPushButton
from PySide6.QtTest import QTest


class NativeGuiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.application = app()
        self.ui = DesktopUI()
        self.errors = []
        self.timer = QTimer()

    def tearDown(self):
        self.timer.stop()
        self.temp.cleanup()

    def automate(self, object_name, action):
        def tick():
            for widget in self.application.topLevelWidgets():
                if isinstance(widget, QDialog) and widget.objectName() == object_name and widget.isVisible():
                    try:
                        if action(widget):
                            self.timer.stop()
                    except BaseException as e:
                        self.errors.append(e)
                        self.timer.stop()
                        widget.reject()
        self.timer.timeout.connect(tick)
        self.timer.start(50)

    def test_native_masked_capture(self):
        request = Request.parse(spec(self.root))
        observed = {}
        def fill(dialog):
            edit = dialog.findChild(QLineEdit, "secret-key")
            observed["masked"] = edit.echoMode() == QLineEdit.EchoMode.Password
            edit.setText(FAKE)
            preview = os.environ.get("SI_TEST_PREVIEW")
            if preview:
                dialog.grab().save(preview)
            buttons = dialog.findChild(QDialogButtonBox)
            QTest.mouseClick(buttons.button(QDialogButtonBox.StandardButton.Ok), Qt.MouseButton.LeftButton)
            return True
        self.automate("secure-input-dialog", fill)
        values, policies = self.ui.capture(request, {}, {"key": "system"}, True)
        self.assertEqual(self.errors, [])
        self.assertTrue(observed["masked"])
        self.assertEqual(values["key"], FAKE)
        self.assertEqual(policies["key"], "system")

    def test_native_cancel(self):
        self.automate("secure-input-dialog", lambda dialog: (dialog.reject() or True))
        result = self.ui.capture(Request.parse(spec(self.root)), {}, {"key": "session"}, True)
        self.assertIsNone(result)

    def test_terminal_interrupt_cancels_modal_dialog(self):
        import signal
        self.automate("secure-input-dialog", lambda dialog: (os.kill(os.getpid(), signal.SIGINT) or True))
        result = self.ui.capture(Request.parse(spec(self.root)), {}, {"key": "session"}, True)
        self.assertIsNone(result)

    def test_many_fields_are_scrollable(self):
        from PySide6.QtWidgets import QScrollArea
        obj = spec(self.root)
        obj["fields"] = [{"name": "key" + str(i), "label": "测试字段 " + str(i), "kind": "token", "usage": "one_shot"} for i in range(16)]
        obj["destination"]["bindings"] = {"/key" + str(i): "key" + str(i) for i in range(16)}
        request = Request.parse(obj)
        observed = {}
        def check(dialog):
            scroll = dialog.findChild(QScrollArea)
            observed["scroll"] = scroll is not None and scroll.verticalScrollBar().maximum() > 0
            observed["fits"] = dialog.height() <= self.application.primaryScreen().availableGeometry().height()
            dialog.reject()
            return True
        self.automate("secure-input-dialog", check)
        self.ui.capture(request, {}, {f.name: "session" for f in request.fields}, True)
        self.assertEqual(self.errors, [])
        self.assertTrue(all(observed.values()))

    def test_real_child_environment_and_local_output(self):
        observed = {}
        def close_finished(dialog):
            labels = [x.text() for x in dialog.findChildren(QLabel)]
            if not any("已结束" in text for text in labels):
                return False
            text = dialog.findChild(QPlainTextEdit).toPlainText()
            observed["stdout"] = "DUMMY_CHILD_RECEIVED" in text
            observed["stderr"] = "DUMMY_CHILD_STDERR" in text
            observed["original"] = FAKE in text
            dialog.accept()
            return True
        self.automate("process-output-dialog", close_finished)
        destination = {
            "executable": str(Path(sys.executable).resolve()), "cwd": str(self.root),
            "args": ["-c", "import os,sys; assert os.environ['SI_GUI_TEST']; print('DUMMY_CHILD_RECEIVED'); print(os.environ['SI_GUI_TEST']); print('DUMMY_CHILD_STDERR',file=sys.stderr)"],
            "bindings": {"SI_GUI_TEST": "key"}, "timeout_seconds": 10,
        }
        before = os.environ.get("SI_GUI_TEST")
        code = self.ui.run_process(destination, {"key": FAKE})
        self.assertEqual(self.errors, [])
        self.assertEqual(code, 0)
        self.assertTrue(all(observed.values()))
        self.assertEqual(os.environ.get("SI_GUI_TEST"), before)


if __name__ == "__main__":
    unittest.main()
